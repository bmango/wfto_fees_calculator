      ko.extenders.numeric = function (target, precision) {
        //create a writable computed observable to intercept writes to our observable
        var result = ko.pureComputed({
          read: target, //always return the original observables value
          write: function (newValue) {
            var current = target(),
                roundingMultiplier = Math.pow(10, precision),
                newValueAsNum = isNaN(newValue) ? 0 : +newValue,
                valueToWrite = Math.round(newValueAsNum * roundingMultiplier) /
                    roundingMultiplier;

            //only write if it changed
            if (valueToWrite !== current) {
              target(valueToWrite);
            } else {
              //if the rounded value is the same, but a different value was written, force a notification for the current field
              if (newValue !== current) {
                target.notifySubscribers(valueToWrite);
              }
            }
          }
        }).extend({
          notify: 'always'
        });

        //initialize with current value to make sure it is rounded appropriately
        result(target());

        //return the new computed observable
        return result;
      };

      function KeyValue(key, value) {
        this.Key = ko.observable(key);
        this.Value = ko.observable(value);
      }

      fees = {
        individualAssociate: {
          normal: 100,
          student: 35
        },
        associateOrganization: {
          steps:
              {
                135000: 500,
                1000000: 1250,
                5000000: 2000,
                Infinity: 3000
              }
        },
        Ftso: {
          steps:
              {
                135000: 500,
                1000000: 1250,
                5000000: 2000,
                Infinity: 3000
              },
          discount: 0.5
        },
        Ftn: 400,
        Fto: {
          lowerBound: 135000,
          middleBound: 1000000,
          middleBoundMultiplier: 0.003,
          aboveMiddleBoundFee: 3000,
          multipleTimesAboveFee: 350,
          lowerBoundFee: 400,
          maximumFee: {
            1: 2600,
            2: 2600,
            3: 10400,
            4: 2600,
            6: 10400
          },
        },
        RegionalFees: {
          1: {
            steps: {
              Infinity: 100
            }
          },
          2: {
            steps: {
              135000: 100,
              400000: 175,
              Infinity: 250
            }
          },
          3: {
            steps: {
              150000: 350,
              1000000: 550,
              Infinity: 850
            }
          },
          4: {
            steps: {
              Infinity: 50
            }
          },
          6: {
            steps: {
              Infinity: 0
            }
          }
        }
      }

      function FeeCalculator(fees) {
        var self = this;
        this.onLoaded = undefined;
        this.getIndividualAssociateNormalFee = function () {
          return fees.individualAssociate.normal;
        }
        this.getIndividualAssociateStudentFee = function () {
          return fees.individualAssociate.student;
        }
        this.getFtnFee = function () {
          return fees.Ftn;
        }
        this.getAssociateOrganizationFee = function (revenue) {
          for (var key in fees.associateOrganization.steps) {
            if (+revenue < +key) {
              return fees.associateOrganization.steps[key];
            }
          }
        }
        this.getFtsoFee = function (revenue, discount) {
          for (var key in fees.Ftso.steps) {
            if (+revenue < +key) {
              var fee = fees.Ftso.steps[key];
              return discount ? fee * fees.Ftso.discount : fee;
            }
          }
        }
        this.getFTOFee = function (turnover, regionId) {
          if (+turnover < fees.Fto.lowerBound) {
            return fees.Fto.lowerBoundFee;
          }
          if (+turnover < fees.Fto.middleBound) {
            return +turnover * fees.Fto.middleBoundMultiplier;
          }
          var fee = fees.Fto.aboveMiddleBoundFee + (Math.floor(turnover / fees.Fto.middleBound) -
              1) * fees.Fto.multipleTimesAboveFee;
          return fee > fees.Fto.maximumFee[regionId] ? fees.Fto.maximumFee[regionId] :
              fee;
        }
        this.getRegionalFee = function (revenue, regionId) {
          for (var key in fees.RegionalFees[regionId].steps) {
            if (+revenue < +key) {
              return fees.RegionalFees[regionId].steps[key];
            }
          }
        }
      }

      var calc = new FeeCalculator(fees);

      function FeeModel(feeCalculator) {
        var self = this;



        var serviceFactory = new ServiceFactory("/sites/all/themes/wfto_2019/js/fees/conf/memberapi.json");
        serviceFactory.onLoaded = function () {
          self.countries = serviceFactory.getCountryService("Select country...");
          self.regionId = self.countries.selected;


          var setFee = function (changed) {
            self.fee(undefined);
            self.regionalFee(undefined);

            if (self.associateStatus()) {
              if (self.associateOrganisationStatus() && self.revenue()) {
                self.fee(feeCalculator.getAssociateOrganizationFee(self.revenue()));
              } else if (self.associateIndividualStatus()) {
                if (self.individualAssociateNormalStatus()) {
                  self.fee(feeCalculator.getIndividualAssociateNormalFee());
                } else if (self.individualAssociateStudentStatus()) {
                  self.fee(feeCalculator.getIndividualAssociateStudentFee());
                }
              }
              return;
            } else if (self.membershipStatus()) {
              if (self.regionId() === undefined || self.regionId() < 0) {
                return;
              }
              if (self.isFto()) {
                fee = feeCalculator.getFTOFee(self.turnover(), self.regionId());
                self.fee(Math.round(fee * 100) / 100);
              } else if (self.isFtn()) {
                self.fee(feeCalculator.getFtnFee());
              } else if (self.isFtso() && self.directLinkWithFto() !== undefined) {
                self.fee(feeCalculator.getFtsoFee(self.revenue(), self.directLinkWithFto() === 'true'));
              }
              self.regionalFee(feeCalculator.getRegionalFee(self.revenue(), self.regionId()));
            }
          };
          self.statusApplyingFor.subscribe(setFee);
          self.associateIndividualStatus.subscribe(setFee);
          self.associateOrganisationStatus.subscribe(setFee);
          self.ftsoOrFtn.subscribe(setFee);
          self.associate.subscribe(setFee);
          self.member.subscribe(setFee);
          self.revenue.subscribe(setFee);
          self.turnover.subscribe(setFee);
          self.directLinkWithFto.subscribe(setFee);
          self.regionId.subscribe(setFee);

          self.individualAssociateStatusApplyingFor.subscribe(setFee);

          if (self.onLoaded) {
            self.onLoaded();
          }
        };

        function decisionTree() {

        }

        this.membershipTypes = ko.observableArray(
            [new KeyValue("FTO", "Fair Trade Organisation (FTO)"),
              new KeyValue("FTSO", "Fair Trade Support Organisation (FTSO)"),
              new KeyValue("AO", "Associate Organisation (AO)"),
              new KeyValue("FTN", "Fair Trade Network (FTN)"),
              new KeyValue("IA", "Individual Associates (IA)")
            ]
        );
        this.turnover = ko.observable();
        this.revenue = ko.observable(0);
        this.associate = ko.observable();
        this.member = ko.observable();
        this.selectedMemberType = ko.observable();
        this.fee = ko.observable();
        this.regionalFee = ko.observable();
        var setFee = this.fee;
        this.isFto = ko.observable();
        this.isFtso = ko.observable();
        this.isFtn = ko.observable();
        this.ftsoOrFtn = ko.observable();
        this.isFtsoOrFtn = ko.observable();
        this.ftsoOrFtn.subscribe(
            function () {
              self.isFtso(self.membershipStatus() && self.ftsoOrFtn() === 'FTSO');
              self.isFtn(self.membershipStatus() && self.ftsoOrFtn() === 'FTN');
            }
        );
        var isFtn = function () {
          self.isFto(false);
          self.isFtsoOrFtn(false);
          if (self.revenue() === undefined || self.turnover() === undefined) return;
          var fto = (self.turnover() > 1000000 || self.turnover() / self.revenue() > 0.5);
          self.isFto(fto);
          self.isFtsoOrFtn(!fto);
        }
        this.revenue.subscribe(isFtn);
        this.turnover.subscribe(isFtn);
        this.statusApplyingFor = ko.observable();


        this.membershipStatus = ko.observable(true);
        this.associateStatus = ko.observable();
        this.statusApplyingFor.subscribe(function () {
          self.membershipStatus(self.statusApplyingFor() == 'membership');
          self.associateStatus(self.statusApplyingFor() == 'associate');
        });
        this.associateStatusApplyingFor = ko.observable();

        this.associateOrganisationStatus = ko.observable();
        this.associateIndividualStatus = ko.observable();
        this.individualAssociateNormalStatus = ko.observable();
        this.individualAssociateStudentStatus = ko.observable();
        this.associateStatusApplyingFor.subscribe(
            function () {
              self.associateOrganisationStatus(self.associateStatus() && self.associateStatusApplyingFor() == 'organisation');
              self.associateIndividualStatus(self.associateStatus() && self.associateStatusApplyingFor() == 'individual');
            });
        this.individualAssociateStatusApplyingFor = ko.observable();
        this.directLinkWithFto = ko.observable();
        this.individualAssociateStatusApplyingFor.subscribe(
            function (selectedValue) {
              self.individualAssociateNormalStatus(selectedValue == 'normal');
              self.individualAssociateStudentStatus(selectedValue == 'student');
            }
        );

        this.selectedMemberType.subscribe(this.calculateFee);
        this.fee = ko.observable(undefined);
      }

      jQuery(document).ready(function () {
        //alert('hi');
        var feeModel = new FeeModel(calc);
        feeModel.onLoaded = function () {
          ko.applyBindings(feeModel);
        };
  });
