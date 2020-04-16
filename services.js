

      function KeyValue(data) {
        this.Id = ko.observable(data.Id);
        this.Name = ko.observable(data.Name);
      }

      function Country(data) {
        this.Id = ko.observable(data.Id);
        this.Name = ko.observable(data.Name);
        this.RegionId = ko.observable(data.RegionId);
        this.Importer = ko.observable(data.Importer === undefined? 0 : data.Importer);
      }

      function CodeValue(data) {
        this.Code = ko.observable(data.Code);
        this.Name = ko.observable(data.Name);
      }

      function Member(data) {
        this.OrganizationId = ko.observable(data.OrganizationId);
        this.OrganizationName = ko.observable(data.OrganizationName);
        this.OrganizationAddress = ko.observable(data.OrganizationAddress);
        this.OrganizationCity = ko.observable(data.OrganizationCity);
        this.OrganizationPostcode = ko.observable(data.OrganizationPostcode);
        this.OrganizationState = ko.observable(data.OrganizationState);
        this.CountryName = ko.observable(data.CountryName);
        this.RegionName = ko.observable(data.RegionName);
        this.OrganizationPhone = ko.observable(data.OrganizationPhone);
        this.OrganizationEmail = ko.observable(data.OrganizationEmail);
        this.OrganizationWeb = ko.observable(data.OrganizationWeb);
        this.MembershipTypeCode = ko.observable(data.MembershipTypeCode);
        this.MembershipTypeName = ko.observable(data.MembershipTypeName);
        this.MembershipStatusCode = ko.observable(data.MembershipStatusCode);
        this.MembershipStatusName = ko.observable(data.MembershipStatusName);
      }

      function ListViewModel(url, listType, allValue) {
        var self = this;
        self.selected = ko.observable(-1);
        self.values = ko.observableArray([]);
        // Load initial state from server, convert it to Task instances, then populate self.tasks
        jQuery.getJSON(url, function (allData) {
          var mappedValues = jQuery.map(allData, function (item) {
            return new listType(item)
          });

          if (allValue) {
            mappedValues.unshift(allValue);
          }
          self.values(mappedValues);


        });
      }

      function ServiceFactory(serviceDescUrl) {
        self = this;
        this.onLoaded = undefined;
        jQuery.getJSON(serviceDescUrl, function (json) {
          self.serviceDesc = json;
          if (self.onLoaded) {
            self.onLoaded();
          }
        });
        var countryService = undefined;
        this.getCountryService = function (nonSelectedDesc) {
          if (countryService == undefined) {
            countryService = new ListViewModel(self.serviceDesc.countries.address,
                Country,
                nonSelectedDesc ? new Country({
                  "Id": -1,
                  "Name": nonSelectedDesc,
                  "Region": -1
                }) : undefined);
          }
          return countryService;
        }
      };

      function Services(serviceDesc) {


      }

