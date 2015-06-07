var ag;
(function (ag) {
    ko.bindingHandlers["gridRow"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            ko.computed(function () {
                return ag.gridRow.utils.applyStyle($(element), bindingContext, bindingContext.$parents[0]);
            }, null, { disposeWhenNodeIsRemoved: element });
        }
    };

    ko.bindingHandlers["browseGridRow"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var appViewModel = bindingContext.$root, dealLinkSelector = "a.deal-link";

            ko.computed(function () {
                _.delay(function () {
                    ag.gridRow.utils.applyStyle($(element), bindingContext, bindingContext.$parents[0]);
                }, 0);
            }, null, { disposeWhenNodeIsRemoved: element });

            ko.utils.registerEventHandler(element, "click", function (event) {
                if (!$(element).hasClass("selected"))
                    appViewModel.editItem(viewModel);
                else
                    appViewModel.grid.toggle();

                // If this is a deal link, eat the click so that it behaves just like clicking anywhere on the row
                if ($(event.target).is(dealLinkSelector) || $(event.target).parent().is(dealLinkSelector))
                    return false;
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var appViewModel = bindingContext.$root;

            if (appViewModel.grid.isCurrentEditingItem(valueAccessor()))
                $(element).addClass("selected");
            else
                $(element).removeClass("selected");
        }
    };

    (function (gridRow) {
        (function (utils) {
            function applyStyle($tr, bindingContext, grid) {
                var index = ko.unwrap(bindingContext.$index);

                var hasSelected;
                if ($tr.hasClass('selected'))
                    hasSelected = true;
                $tr.removeClass();
                if (hasSelected)
                    $tr.addClass('selected');

                var styleItem = _.find(ko.unwrap(grid.styleDictionary), function (sItem) {
                    return sItem.k === index;
                });

                if (!styleItem)
                    return;

                var reformatCell = function (className) {
                    var firstTD = $tr.children().first(), firstCellLink = firstTD.children('a');

                    firstCellLink.length == 0 ? firstTD.prepend('<div class="{0}"></div>'.format(className)) : firstCellLink.prepend('<div class="{0}"></div>'.format(className));
                };

                _.each(styleItem.s, function (styleType) {
                    switch (styleType) {
                        case 1 /* NotAvailable */:
                            $tr.addClass("not-available");
                            break;
                        case 2 /* Important */:
                            $tr.addClass("important");
                            break;
                        case 3 /* Error */:
                            $tr.addClass("error");
                            break;
                        case 4 /* FolderIcon */:
                            reformatCell("icon-folder-close");
                            break;
                        case 5 /* Pending */:
                            $tr.addClass("pending");
                            break;
                        case 6 /* Indent1 */:
                            $tr.addClass("indent1");
                            reformatCell("indent-div");
                            break;
                        case 7 /* Indent2 */:
                            $tr.addClass("indent2");
                            reformatCell("indent-div");
                            break;
                        case 8 /* Indent3 */:
                            $tr.addClass("indent3");
                            reformatCell("indent-div");
                            break;
                        case 9 /* Indent4 */:
                            $tr.addClass("indent4");
                            reformatCell("indent-div");
                            break;
                        case 10 /* Indent5 */:
                            $tr.addClass("indent5");
                            reformatCell("indent-div");
                            break;
                        case 11 /* Indent6 */:
                            $tr.addClass("indent6");
                            reformatCell("indent-div");
                            break;
                        case 12 /* Indent7 */:
                            $tr.addClass("indent7");
                            reformatCell("indent-div");
                            break;
                        case 13 /* Indent8 */:
                            $tr.addClass("indent8");
                            reformatCell("indent-div");
                            break;
                        case 14 /* Indent9 */:
                            $tr.addClass("indent9");
                            reformatCell("indent-div");
                            break;
                        case 15 /* Indent10 */:
                            $tr.addClass("indent10");
                            reformatCell("indent-div");
                            break;
                    }
                });
            }
            utils.applyStyle = applyStyle;
        })(gridRow.utils || (gridRow.utils = {}));
        var utils = gridRow.utils;
    })(ag.gridRow || (ag.gridRow = {}));
    var gridRow = ag.gridRow;
})(ag || (ag = {}));
