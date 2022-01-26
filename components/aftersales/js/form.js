var Form;

Form = (function(_window) {
    'use strict';

    var bind = function(fn, me) {
        return function() {
            return fn.apply(me, arguments);
        };
    };

    function Form() {
         this.onSubmit = bind(this.onSubmit, this);
         this.onChangeVehicle = bind(this.onChangeVehicle, this);
         this.campaignName = "";
    };

    Form.prototype.defaultParseQueryString = function () {
        var vars = [], hash;
        var hashes = window.location
            .href
            .slice(
                window.location
                    .href
                    .indexOf('?') + 1
            )
            .split('&');

        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }

        return vars;
    };

    Form.prototype.parseQuerystring = function() {
        var args = this.defaultParseQueryString();
        var webFormArguments = {
            car: args.car ? args.car : "",
            origin: args.origin ? args.origin : "",
            subOrigin: args.subOrigin ? args.subOrigin : "",
            campaign: args.campaign ? args.campaign : "",
            leadSource: args.leadSource ? args.leadSource : "",
            leadType: args.leadType ? args.leadType : "",
            recordType: args.recordType ? args.recordType : ""
        };

        return webFormArguments;
    };

    Form.prototype.translateSpecificVehicle = function(carId){
        var translatedId = null;
        if(VEHICLE_CODES){
            for (var i = 0; i < VEHICLE_CODES.length; i++) {
                var vehicle = VEHICLE_CODES[i];

                var index = vehicle.from.indexOf(carId);

                if(index >= 0) {
                    translatedId = vehicle.to;
                    break;
                }
            }
        }

        return translatedId;
    };

    Form.prototype.changeCar = function() {
        var vehicle = $("select[name=vehiclemodel]");

        if(vehicle){
            var itemFound = null;
            var translatedId = this.translateSpecificVehicle(this.args.car);

            var carId = translatedId
                ? translatedId
                : this.args.car;

            if(carId)
                vehicle.children().each(function(index, item){
                    if(item.value === carId){
                        itemFound = item;
                        return;
                    }
                });

            if(itemFound){
                vehicle.val(carId);
                vehicle.attr({
                    "disabled": "disabled"
                });
            } else {
                this.args.car = "";
            }
        }
    };

    Form.prototype.onChangeVehicle = function (e) {
        this.args.car = $(e.target).val();
    };

    Form.prototype.disableCompanyFields = function(){
        this.company.attr({
            'data-parsley-required': false
        })
        .parent()
        .hide();

        //dentro do app.js existe um evento que sobrepõe o .hide deste parent
        //com o remove, não será necessário criar nenhuma gambiarra dentro do compilado
        //para controlar o estado de apresentação deste componente.
        this.documentType
            .parent()
            .remove();
    };

    Form.prototype.findDocument = function() {
      return this.removeSpecialChars(this.cpf.val())
      /*
      var documentType = $("input[name=documentType]:checked").data("id");
      var document = "";

      document = documentType === 0
          ? this.removeSpecialChars(this.cpf.val())
          : this.removeSpecialChars(this.cnpj.val());

      return document;
      */
    };

    Form.prototype.getCampaignName = function(campaign) {
        return $.ajax({
            type: 'get',
            url: "https://audileads-new.herokuapp.com/campaign/getByIdSalesforce?id=" + campaign,
            dataType: 'json'
        });
    };

    Form.prototype.load = function () {
        this.args = this.parseQuerystring();
        this.flagGo = true;
        this.form = $('form');
        this.element = $('.formLead');
        this.content = $('.formLeadContent');
        this.success = $('.formLeadSuccess');
        this.successMessageTitle = $('.formLeadSuccessTitle');
        // this.company = $('input[name=company]');
        this.documentType = $('.formGroup.documentType div');
        this.cpf = $("input[name=cpf]");
        this.cnpj = $("input[name=cnpj]");

        var sendFormButton = $('.send');
        var vehicleSelect =  $('.vehiclemodel select');

        vehicleSelect.on('change', this.onChangeVehicle);
        sendFormButton.on('click', this.onSubmit);

        // if(this.args.recordType !== FORM_TYPE.CorporateSales)
        //     this.disableCompanyFields();

        //Encontra o nome da campanha
        if(this.args.campaign) {
            var campaignPromise = this.getCampaignName(this.args.campaign);

            $.when(campaignPromise).done(
                bind(function(data){
                    this.campaignName = data.campaign;
                },this)
            ).fail(function(error) {
                console.log(error);
            })
        }
    };

    Form.prototype.removeSpecialChars = function(str){
        return str.replace(/[^a-zA-Z 0-9]+/g,'');
    };

    Form.prototype.onSubmit = function(e) {
        e.preventDefault();
        //For checkbox validation.
        $(".newsletter").removeClass("hasError");
        if($(".newsletterCheckbox").find(".term-policy-error").hasClass("term-policy-error"))
        {
            $(".term-policy-error").remove();
        }
        if(!$(".newsletterCheckbox").hasClass("checked")){
            $(".newsletter").addClass("hasError");
            $(".newsletterCheckbox").append('<div class="custom-checkbox-error"><label class="term-policy-error"><span class="labelTitle" style="width: 100%; margin-top: 40px; background-color: transparent; display: block; text-align: right; font-family: AudiTypeV03-Normal; font-size: 13px;">*É necessário concordar com Declaração de Privacidade.</span></label></div>');
        }else{
            $(".term-policy-error").remove();
        }
        
        
        if (!this.form.parsley().validate()) {
            this.element.find('.hasError').eq(0).find('select, input').focus();
        }

        if (this.form.parsley().isValid() && this.flagGo) {
            this.flagGo = false;
            this.element.find('.send').val('Enviando...');
            var dealers = [];
            var vehicles = [];

            this.element.find('.seller select').each(function() {
                if ($(this).val() !== '') {
                return dealers.push($(this).val());
                }
            });

            this.element.find('.vehiclemodel select').each(function() {
                if ($(this).val() !== '') {
                return vehicles.push($(this).val());
                }
            });

            var name = this.element.find('.name input').val();
            var firstName = '';
            var lastName = '';

            if(name && name.indexOf !== ' ' >= 0) {
                var names = name.split(' ');
                firstName = names[0];
                names.splice(0, 1);
                lastName = names.join(' ');
            } else {
                firstName = name;
            }

            var interestType = "Information"

            var postData = {
                "salutation": $('input[name=salutation]:checked').data('id'),
                "first_name": firstName,
                "00N4100000VtFGj": this.findDocument(),
                // "00N4100000VtGXC": $('.birthday input').val(),
                "phone": $('.phone input').val(),
                "email": $('.email input').val(),
                "optIn": $('.newsletterCheckbox').hasClass('checked') ? 1 : 0,
                "00N4100000VtFBj": dealers[0],
                "00N4100000VtFCm": $('.seller select').eq(1).val(),
                "oid": "00D41000002ElAp",
                "retURL": "http://www.audi.com.br/",
                "recordType": this.args.recordType,
                // "00N4100000VtGX2": $("input[name=documentType]:checked").data("id") === 1 ? "LegalPerson" : "NaturalPerson",
                // now it's alwaus natural person
                "00N4100000VtGX2": "NaturalPerson",
                "lead_source": this.args.leadSource,
                "00N4100000VtFDa": this.args.car,
                "00N4100000VtFDz": $("select[name=vehiclemodel] option:selected").text(),
                "00N4100000VtGde": this.campaignName,
                "00N4100000VtFE9": "",
                "description": $("textarea[name=description]").val(),
                // "00N4100000X9OCW": $("select[name=yearModel]").val(),
                // "00N4100000X9OCb": $("select[name=yearFabrication]").val(),
                // "00N4100000X9OC2": $("input[name=currentKm]").val(),
                // "00N4100000X9OC7": $("input[name=carPlate]").val(),
                // "00N4100000X9OCR": $("input[name=chassi]").val(),

                // "00N4100000X9OCg": $("select[name=solicitation] option:selected").val(),
                // solicitation must be fixed now
                "00N4100000X9OCg": "Agendamento de revisão/serviço",
                "00N4100000VtGXR": interestType,
                "state": $('select[name=state] option:selected').text(),
                "city": $('select[name=city] option:selected').text(),
                // "company": $('input[name=company]').val(),
                "Campaign_ID": unescape(this.args.campaign),
                "rating": "Warm",
                "00N4100000VtFIL": "Phone",
                "last_name": lastName,
                "00N4100000bOzjS": sessionStorage.utm_campaign,
                "00N4100000bOzjN": sessionStorage.utm_content,
                "00N4100000bOzjD": sessionStorage.utm_medium,
                "00N4100000bOziZ": sessionStorage.utm_source,
                "00N4100000bOzjX": sessionStorage.utm_term
            };

            // no more additional dealers
            /*
            if(dealers.length > 1) {
                postData["00N4100000VtFCm"] = dealers[1];
            }
            */

            if($('.newsletterCheckbox').hasClass('checked')) {
                postData["00N4100000VtGWs"] = "1";
                postData["00N4100000XA0He"] = "1";
                postData["00N4100000VtGWn"] = "1";
            }

            if(this.args.recordType === FORM_TYPE.CorporateSales)
                postData["company"] = this.company.val();

            $.ajax({
                url: "https://audi-cors-new.herokuapp.com/webto.salesforce.com:443/servlet/servlet.WebToLead?encoding=UTF-8",
                method: 'post',
                data: postData,
                error: (function(_this) {
                    return function(jqXHR, textStatus, errorThrown) {
                        _this.successMessageTitle.html('<strong>Cadastro enviado com sucesso. Em breve entraremos em contato para finalizar seu agendamento. Obrigado!</strong><br/>.');

                        TweenMax.to(_this.success, 3, {
                            autoAlpha: 1,
                            ease: Quart.easeIn,
                            onComplete: function() {
                                _this.flagGo = true;

                                $('body').scrollTop(0);

                                _this.content.css({
                                    'display': 'none'
                                });

                                _this.success.css({
                                    'display': 'table-cell'
                                });
                            }
                        });
                    };
                })(this),
                success: (function(_this) {
                    return function(data, textStatus, jqXHR) {
                        _this.successMessageTitle.html('<strong>Cadastro enviado com sucesso. Em breve entraremos em contato para finalizar seu agendamento. Obrigado!</strong><br/>.');

                        TweenMax.to(_this.success, 3, {
                            autoAlpha: 1,
                            ease: Quart.easeIn,
                            onComplete: function() {
                                _this.flagGo = true;

                                $('body').scrollTop(0);

                                _this.content.css({
                                    'display': 'none'
                                });

                                _this.success.css({
                                    'display': 'table-cell'
                                });
                            }
                        });
                    };
                })(this)
            });
        }
    };

    return Form;
})();
