var mongoose = require('mongoose'),
    Deal = mongoose.model("Deal"),
    ObjectId = mongoose.Types.ObjectId

//added by steven.xu
exports.createDeal = function (req, res, next) {
    var dealModel = new Deal(req.body);
    dealModel.save(function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            res.json({
                type: true,
                data: deal
            })
        }
    })
}

//added by steven.xu
exports.viewDeal = function (req, res, next) {
    Deal.findById(new ObjectId(req.params.id), function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deal) {
                res.json({
                    type: true,
                    data: deal
                })
            } else {
                res.json({
                    type: false,
                    data: "Deal: " + req.params.id + " not found"
                })
            }
        }
    })
}
//added by steven.xu
exports.updateDeal = function (req, res, next) {
    var updatedDealModel = new Deal(req.body);
    Deal.findByIdAndUpdate(new ObjectId(req.params.id), updatedDealModel, function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deal) {
                res.json({
                    type: true,
                    data: deal
                })
            } else {
                res.json({
                    type: false,
                    data: "Deal: " + req.params.id + " not found"
                })
            }
        }
    })
}
//added by steven.xu
exports.deleteDeal = function (req, res, next) {
    Deal.findByIdAndRemove(new Object(req.params.id), function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            res.json({
                type: true,
                data: "Deal: " + req.params.id + " deleted successfully"
            })
        }
    })
}


exports.list = function(req, res) {
    Deal.find( function(err, deals) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deals) {
                var result={"data":[{"dealNumber":2264,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-22T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2280,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-29T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2281,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-22T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2291,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-29T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2292,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-22T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2293,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-23T00:00:00+08:00","dealsdealer":"Abbey","dealsentity":"EFT Corporation","dealssectype":"CM FX Forward"},{"dealNumber":2294,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-23T00:00:00+08:00","dealsdealer":"Abbey","dealsentity":"EFT Corporation","dealssectype":"CM FX Forward"},{"dealNumber":2295,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-29T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2296,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-22T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2304,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-29T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2305,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-22T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2313,"dealscparty":"ADB Netting","dealscurmatdt":"2010-01-29T00:00:00+08:00","dealsdealer":"baseline","dealsentity":"EFT Corporation","dealssectype":"CM FX Forward"},{"dealNumber":2339,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-29T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2340,"dealscparty":"ABN Singapore","dealscurmatdt":"2009-04-22T00:00:00+08:00","dealsdealer":"Admin","dealsentity":"EFT Corporation","dealssectype":"FX Spot"},{"dealNumber":2391,"dealscparty":"ANZ","dealscurmatdt":"1992-12-01T00:00:00+08:00","dealsdealer":"carolynd","dealsentity":"Transactor - Level 2","dealssectype":"NBD FX Forward"},{"dealNumber":2392,"dealscparty":"ANZ","dealscurmatdt":"1992-12-01T00:00:00+08:00","dealsdealer":"carolynd","dealsentity":"Transactor - Level 2","dealssectype":"NBD FX Forward"},{"dealNumber":2393,"dealscparty":"ANZ","dealscurmatdt":"1992-12-01T00:00:00+08:00","dealsdealer":"carolynd","dealsentity":"Transactor - Level 2","dealssectype":"NBD FX Commodity Fwd"},{"dealNumber":2394,"dealscparty":"ANZ","dealscurmatdt":"1992-12-03T00:00:00+08:00","dealsdealer":"carolynd","dealsentity":"Transactor - Level 2","dealssectype":"NBD FX Forward"},{"dealNumber":2395,"dealscparty":"ANZ","dealscurmatdt":"1992-12-03T00:00:00+08:00","dealsdealer":"carolynd","dealsentity":"Transactor - Level 2","dealssectype":"NBD FX Forward"},{"dealNumber":2396,"dealscparty":"ANZ","dealscurmatdt":"1992-12-01T00:00:00+08:00","dealsdealer":"carolynd","dealsentity":"Transactor - Level 2","dealssectype":"NBD FX Commodity Fwd"}],"views":null,"gridViewOptions":{"styleDictionary":[],"gridGuid":"00000000-0000-0000-0000-000000000000","sortOptions":[],"rowFilters":[],"columnFilters":[],"pivotFilters":[],"page":1,"pageSize":20,"totalPages":95,"totalItems":1894,"pageFrom":0,"pageTo":0,"columns":null,"view":"All","drillDownLevel":0,"searchText":null,"searchTerms":[],"searchKeyColumnOnly":false,"searchColumnName":""},"pageTargets":[],"columnDisplayNames":null,"message":null};

                res.json(result)
            } else {
                res.json({
                    type: false,
                    data: "Comment: " + req.params.id + " not found"
                })
            }
        }
    })
}


exports.edit = function(req, res) {
    Deal.find( function(err, deals) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deals) {
                var result={"data":{"isLeftLeg":false,"isSwapDeal":false,"isBackToBackDeal":false,"backToBackLink":0,"backToBackSide":0,"baseType":null,"clsSettlement":0,"contingent":null,"contractRate":"0.63712871","currencyOptionDeal":0,"daysOffset":0,"dealRate":"SPOT & FORWARD","dominantCurrency":null,"fixDate":null,"fixRate":"0.00000000","forwardPoints":"-28.7129","forwardPointsAmount":null,"forwardPointsCurrency":null,"forwardPointsPostingDate":null,"forwardPostingDate":"0001-01-01T00:00:00+08:00","nonBusinessDaySettlement":10110002,"otherFaceValue":"10100000.0000","overrideTransactionRate":false,"rateFixAmount":null,"settleCurrency":"","settlementDateBuy":"2007-10-04T00:00:00+08:00","settlementDateSell":"2007-10-04T00:00:00+08:00","settlementType":10020003,"splitSettlement":false,"spotRate":"0.64","startDate":"2007-10-02T00:00:00+08:00","swapDeal":0,"swapLink":0,"swapSide":0,"timeOption":true,"effectiveDate":null,"showEffectiveDate":false,"canRollback":false,"allowedToRollback":true,"canRateFix":false,"allowedToRateFix":true,"canDrawdown":true,"allowedToDrawdown":true,"canExtendPreDeliver":false,"allowedToExtendPreDeliver":true,"instrumentAccessSettings":{"forwardPoints":{"hidden":false,"readOnly":false,"required":true},"spotRate":{"hidden":false,"readOnly":false,"required":true},"settlementCurrency":{"hidden":true,"readOnly":false,"required":false},"fixDate":{"hidden":true,"readOnly":false,"required":false},"settlementDateBuy":{"hidden":true,"readOnly":false,"required":false},"settlementDateSell":{"hidden":true,"readOnly":false,"required":false},"term":{"hidden":false,"readOnly":false,"required":false},"eligibleForClearing":{"hidden":false,"readOnly":false,"required":false},"clearingHouse":{"hidden":true,"readOnly":true,"required":false},"clearingBroker":{"hidden":true,"readOnly":true,"required":false},"reportToTradeRepository":{"hidden":false,"readOnly":false,"required":false},"tradeIdentifier1":{"hidden":true,"readOnly":false,"required":false},"tradeIdentifier2":{"hidden":true,"readOnly":false,"required":false},"tradeIdentifier3":{"hidden":true,"readOnly":false,"required":false},"tradeIdentifier4":{"hidden":true,"readOnly":false,"required":false},"ticketNumber":{"hidden":false,"readOnly":false,"required":false},"broker":{"hidden":true,"readOnly":false,"required":false},"dealDate":{"hidden":false,"readOnly":false,"required":false},"maturityDate":{"hidden":false,"readOnly":false,"required":true},"counterpartyDealer":{"hidden":false,"readOnly":false,"required":false},"counterpartyReference":{"hidden":false,"readOnly":false,"required":false},"strategy":{"hidden":false,"readOnly":false,"required":false}},"transactions":null,"dealsetNumber":0,"status":"","statusBalance":"","statusFixRate":false,"statusDrawnDown":false,"statusPreDelivered":false,"statusDealSet":false,"statusLinkToHR":false,"statusExtended":false,"statusPartiallyDrawnDown":false,"calculateBuyAmount":false,"isBuyAmountChanged":false,"isSellAmountChanged":false,"eligibleForClearing":false,"reportToTradeRepository":false,"clearingHouse":"","tradeIdentifierCaption1":"","tradeIdentifierCaption2":"","tradeIdentifierCaption3":"","tradeIdentifierCaption4":"","tradeIdentifier1":"","tradeIdentifier2":"","tradeIdentifier3":"","tradeIdentifier4":"","clearingBroker":"","instrumentChanged":false,"baseRate":null,"broker":"","comments":"","counterparty":"CITIBANK","counterpartyDealer":"","counterpartyDealerContact":null,"counterpartyReference":"","currency":"USD","dealDate":"2007-10-02T00:00:00+08:00","dealer":"baseline","dealNumber":196,"dealSet":"NONE","dealType":10090001,"displayBrokerField":false,"brokerRequired":false,"entity":"Transactor - Level 2","externalCounterpartyName":"","externalEntityName":"","faceValue":"6435000.0000","facility":"","instrument":"FX Forward - Time Option","deleted":false,"location":["Canberra","Sydney"],"maturityDate":"2007-10-04T00:00:00+08:00","otherCurrency":"AUD","quoteNumber":0,"roundingMethodToOverrideCCY":0,"roundingMethodToOverrideCCY2":0,"settlementDate":"2007-10-04T00:00:00+08:00","showExternalCounterpartyName":false,"showExternalEntityName":false,"showTicketNumber":true,"stamp":2,"strategy":"NONE","subdealStamp":0,"term":2,"ticketNumber":"54242 - 1","moduleName":"FXDEAL","transactionType":10730009,"security":false,"imageNumber":1,"usingImage":false,"dealMapEditMode":0,"dealMapWorkingMode":0,"includeReversals":false,"includeRevaluations":false,"includeAccruals":false,"includeCurrencyTranslation":false,"includeJournals":false,"includeUnderlyingDealsLedgerEntries":false,"includeUnderlyingDealsCashflow":false,"generalLedger":null,"cashFlows":null,"dealMap":null,"notes":null,"quotes":null,"dealHedgeRelationshipLinks":[],"showDealHedgeRelationshipLinks":false,"showNotes":true,"analysisCodes":[{"codeType":0,"setKey":"370","name":"Additional Conditions","isSoft":true,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"381","name":"Availability","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"492","name":"Camera","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"487","name":"DB Type","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"5","name":"DEALS","isSoft":true,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"482","name":"deals08Color","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"483","name":"deals09 Size","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"484","name":"deals10 City","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"485","name":"deals11 Brand","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"486","name":"deals12 Bank","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"494","name":"FM Radio","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"491","name":"Memory","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"488","name":"NetWork","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"497","name":"Operation System","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":""},{"codeType":0,"setKey":"496","name":"Produce Year","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":""},{"codeType":0,"setKey":"6","name":"QA PERSON","isSoft":true,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"56","name":"REPURCHASE AGREEMENTS","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"489","name":"Screen Size","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"495","name":"Service","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":""},{"codeType":0,"setKey":"378","name":"SG","isSoft":true,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"490","name":"Speed","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"371","name":"Type of Agreement","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":0,"setKey":"493","name":"Video Type","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"468","name":"AnaFX07","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"469","name":"AnaFX08","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"470","name":"AnaFX09","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"471","name":"AnaFX10","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"15","name":"AUD","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"380","name":"Availabliity","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"364","name":"CCY","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"365","name":"CCY Leg","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"16","name":"FORWARD","isSoft":true,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"},{"codeType":1,"setKey":"17","name":"NZD","isSoft":false,"mandatory":false,"dataType":11670001,"decimalPlaces":null,"minValue":"0","maxValue":"0","usePredefinedValues":true,"valueAsObject":"NONE"}],"canRename":false,"systemOwnerType":null,"systemOwnerName":null,"externalReferenceText":null,"externalReferenceNumber":0,"canUndoCustomization":false,"customizationLevel":0,"canUndoDealActions":true,"financialFieldsReadOnly":true,"analyticsId":null,"isLinkedByGLJournalDeals":false},"message":null};

                res.json(result)
            } else {
                res.json({
                    type: false,
                    data: "Comment: " + req.params.id + " not found"
                })
            }
        }
    })
}

exports.getNonBusinessDays = function(req, res) {
    Deal.find( function(err, deals) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deals) {
                var result=["2007-04-06T00:00:00+08:00","2007-07-04T00:00:00+08:00","2007-12-15T00:00:00+08:00","2007-01-06T00:00:00+08:00","2007-01-07T00:00:00+08:00","2007-01-13T00:00:00+08:00","2007-01-14T00:00:00+08:00","2007-01-20T00:00:00+08:00","2007-01-21T00:00:00+08:00","2007-01-27T00:00:00+08:00","2007-01-28T00:00:00+08:00","2007-02-03T00:00:00+08:00","2007-02-04T00:00:00+08:00","2007-02-10T00:00:00+08:00","2007-02-11T00:00:00+08:00","2007-02-17T00:00:00+08:00","2007-02-18T00:00:00+08:00","2007-02-24T00:00:00+08:00","2007-02-25T00:00:00+08:00","2007-03-03T00:00:00+08:00","2007-03-04T00:00:00+08:00","2007-03-10T00:00:00+08:00","2007-03-11T00:00:00+08:00","2007-03-17T00:00:00+08:00","2007-03-18T00:00:00+08:00","2007-03-24T00:00:00+08:00","2007-03-25T00:00:00+08:00","2007-03-31T00:00:00+08:00","2007-04-01T00:00:00+08:00","2007-04-07T00:00:00+08:00","2007-04-08T00:00:00+08:00","2007-04-14T00:00:00+08:00","2007-04-15T00:00:00+08:00","2007-04-21T00:00:00+08:00","2007-04-22T00:00:00+08:00","2007-04-28T00:00:00+08:00","2007-04-29T00:00:00+08:00","2007-05-05T00:00:00+08:00","2007-05-06T00:00:00+08:00","2007-05-12T00:00:00+08:00","2007-05-13T00:00:00+08:00","2007-05-19T00:00:00+08:00","2007-05-20T00:00:00+08:00","2007-05-26T00:00:00+08:00","2007-05-27T00:00:00+08:00","2007-06-02T00:00:00+08:00","2007-06-03T00:00:00+08:00","2007-06-09T00:00:00+08:00","2007-06-10T00:00:00+08:00","2007-06-16T00:00:00+08:00","2007-06-17T00:00:00+08:00","2007-06-23T00:00:00+08:00","2007-06-24T00:00:00+08:00","2007-06-30T00:00:00+08:00","2007-07-01T00:00:00+08:00","2007-07-07T00:00:00+08:00","2007-07-08T00:00:00+08:00","2007-07-14T00:00:00+08:00","2007-07-15T00:00:00+08:00","2007-07-21T00:00:00+08:00","2007-07-22T00:00:00+08:00","2007-07-28T00:00:00+08:00","2007-07-29T00:00:00+08:00","2007-08-04T00:00:00+08:00","2007-08-05T00:00:00+08:00","2007-08-11T00:00:00+08:00","2007-08-12T00:00:00+08:00","2007-08-18T00:00:00+08:00","2007-08-19T00:00:00+08:00","2007-08-25T00:00:00+08:00","2007-08-26T00:00:00+08:00","2007-09-01T00:00:00+08:00","2007-09-02T00:00:00+08:00","2007-09-08T00:00:00+08:00","2007-09-09T00:00:00+08:00","2007-09-15T00:00:00+08:00","2007-09-16T00:00:00+08:00","2007-09-22T00:00:00+08:00","2007-09-23T00:00:00+08:00","2007-09-29T00:00:00+08:00","2007-09-30T00:00:00+08:00","2007-10-06T00:00:00+08:00","2007-10-07T00:00:00+08:00","2007-10-13T00:00:00+08:00","2007-10-14T00:00:00+08:00","2007-10-20T00:00:00+08:00","2007-10-21T00:00:00+08:00","2007-10-27T00:00:00+08:00","2007-10-28T00:00:00+08:00","2007-11-03T00:00:00+08:00","2007-11-04T00:00:00+08:00","2007-11-10T00:00:00+08:00","2007-11-11T00:00:00+08:00","2007-11-17T00:00:00+08:00","2007-11-18T00:00:00+08:00","2007-11-24T00:00:00+08:00","2007-11-25T00:00:00+08:00","2007-12-01T00:00:00+08:00","2007-12-02T00:00:00+08:00","2007-12-08T00:00:00+08:00","2007-12-09T00:00:00+08:00","2007-12-16T00:00:00+08:00","2007-12-22T00:00:00+08:00","2007-12-23T00:00:00+08:00","2007-12-29T00:00:00+08:00","2007-12-30T00:00:00+08:00"];

                res.json(result)
            } else {
                res.json({
                    type: false,
                    data: "Comment: " + req.params.id + " not found"
                })
            }
        }
    })
}
