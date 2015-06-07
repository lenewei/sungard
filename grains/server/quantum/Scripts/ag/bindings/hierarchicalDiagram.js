/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["hierarchicalDiagram"] = {
        init: function (element, valueAccessor, allBindings, currentContext, allBindingContext) {
            var diagramViewModel;

            // With out diagram view model in the root context no need to show those buttons
            if (_.has(allBindingContext.$root, "diagramViewModel")) {
                // Rearrange control buttons to align with the Cancel button in the modal dialog
                ag.dom.hierarchicalDiagram.rearrangeDiagramButtons($(element));
                diagramViewModel = allBindingContext.$root.diagramViewModel;
            }

            var dialogApplicationAction = valueAccessor(), modelValueUpdatedSubscription;

            modelValueUpdatedSubscription = (dialogApplicationAction.modelValueUpdated).subscribe(function () {
                var data = ko.mapping.toJS(dialogApplicationAction.model), $element = $(element);

                data = [data];

                $element.kendoDiagram({
                    editable: false,
                    selectable: false,
                    dataSource: new kendo.data.HierarchicalDataSource({
                        data: data,
                        schema: {
                            model: { children: "items" }
                        }
                    }),
                    layout: {
                        type: "tree",
                        subtype: "tipOver",
                        verticalSeparation: 50,
                        underneathHorizontalOffset: 50
                    },
                    shapeDefaults: {
                        visual: ag.dom.hierarchicalDiagram.visualTemplate
                    },
                    connectionDefaults: {
                        stroke: { width: 0, opacity: 0 }
                    },
                    click: function (e) {
                        if (diagramViewModel)
                            diagramViewModel.doNavigation(e.item);
                    }
                });

                var diagram = $element.getKendoDiagram();

                /* RENDER LINES CORRECTLY */
                var stroke = {
                    width: 1,
                    dashType: "solid",
                    opacity: 1,
                    lineCap: "round",
                    color: "#979797",
                    startCap: "none"
                };

                var numConnections = diagram.connections.length;
                for (var i = 0; i < numConnections; i++) {
                    var shape1 = diagram.connections[i].from, shape2 = diagram.connections[i].to;

                    var posShape1Left = shape1.getPosition("left"), posShape1Bottom = shape1.getPosition("bottom"), posShape1Top = shape1.getPosition("top"), posShape2Left = shape2.getPosition("left"), posShape2Top = shape2.getPosition("top");

                    var point1 = { x: 0, y: 0 }, point2 = { x: 0, y: 0 }, connector1 = 0, connector2 = 0, offset = diagram.options.layout.underneathHorizontalOffset / 2;

                    // test whether the shapes are 'verticalSeparation' apart --> then first row
                    if (posShape2Top.y - posShape1Bottom.y == diagram.options.layout.verticalSeparation) {
                        // first row of shapes - connect bottom to top
                        point1.x = posShape1Bottom.x;
                        point1.y = posShape1Bottom.y + ((posShape2Top.y - posShape1Bottom.y) / 2);
                        point2.x = posShape2Top.x;
                        point2.y = point1.y;

                        connector1 = 2;
                        connector2 = 0;
                    } else {
                        if (shape1.dataItem.isIsolated) {
                            // isolated shape
                            point1.x = posShape1Top.x;
                            point1.y = posShape1Top.y - diagram.options.layout.verticalSeparation / 2;
                            point2.x = posShape2Left.x - diagram.options.layout.underneathHorizontalOffset + 10;
                            point2.y = posShape2Left.y;

                            connector1 = 0;
                            connector2 = 3;
                        } else {
                            // any other shape - connect left to left
                            point1.x = posShape1Left.x + offset;
                            point1.y = posShape1Left.y;

                            point2.x = posShape2Left.x - diagram.options.layout.underneathHorizontalOffset + offset;
                            point2.y = posShape2Left.y;

                            connector1 = 3;
                            connector2 = 3;
                        }
                    }
                    ;

                    // rub out any lines drawn by other connections first
                    diagram.connect(shape1.connectors[connector1], shape2.connectors[connector2], {
                        stroke: { width: 1, opacity: 1, color: "#fff" },
                        points: [point1, point2]
                    });

                    // draw connection with proper stroke
                    diagram.connect(shape1.connectors[connector1], shape2.connectors[connector2], {
                        stroke: stroke,
                        points: [point1, point2]
                    });
                }

                diagram.toFront(diagram.shapes);

                /* END */
                _.delay(function () {
                    diagram.resize();
                    diagram.bringIntoView(diagram.shapes);

                    if (diagramViewModel)
                        diagramViewModel.init($(element), diagram);
                }, 100);
            });

            // Dispose
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                modelValueUpdatedSubscription.dispose();

                var diagram = $(element).getKendoDiagram();
                if (diagram)
                    diagram.destroy();
            });
        }
    };
})(ag || (ag = {}));

var ag;
(function (ag) {
    (function (dom) {
        (function (hierarchicalDiagram) {
            function rearrangeDiagramButtons($diagramElement) {
                var $diagramButtonGroup = $($diagramElement.siblings("#diagramButtonGroup")), $modalFooter = $($($diagramElement).parent().siblings('div.modal-footer'));

                $diagramButtonGroup.children().insertBefore($modalFooter.children());
            }
            hierarchicalDiagram.rearrangeDiagramButtons = rearrangeDiagramButtons;

            function GetDisplayStatusPalette(displayStauts) {
                if (typeof displayStauts === "undefined") { displayStauts = 0; }
                switch (displayStauts) {
                    case 0:
                        return {
                            backgroundColor: "#006595",
                            borderColor: "#00496c",
                            subTextColor: "#99c1d5"
                        };

                    case 1:
                        return {
                            backgroundColor: "#e89719",
                            borderColor: "#c57f14",
                            subTextColor: "#f6d5a3"
                        };

                    case 2:
                        return {
                            backgroundColor: "#94a545",
                            borderColor: "#7a8839",
                            subTextColor: "#d4dbb5"
                        };

                    case 3:
                        return {
                            backgroundColor: "#b0232b",
                            borderColor: "#8e1c23",
                            subTextColor: "#dfa7aa"
                        };

                    case 4:
                        return {
                            backgroundColor: "#f6c615",
                            borderColor: "#daad08",
                            subTextColor: "#fbe8a1"
                        };

                    case 5:
                        return {
                            backgroundColor: "#532e63",
                            borderColor: "#3c2147",
                            subTextColor: "#baabc1"
                        };

                    case 6:
                        return {
                            backgroundColor: "#006595",
                            borderColor: "#002f35",
                            subTextColor: "#99babf"
                        };

                    case 7:
                        return {
                            backgroundColor: "#9a8b7d",
                            borderColor: "#7e888e",
                            subTextColor: "#d4d7d9"
                        };

                    default:
                        return {
                            backgroundColor: "#9a8b7d",
                            borderColor: "#867768",
                            subTextColor: "#d7d1cb"
                        };
                }
            }
            hierarchicalDiagram.GetDisplayStatusPalette = GetDisplayStatusPalette;

            function visualTemplate(options) {
                var dataviz = kendo.dataviz, g = new dataviz.diagram.Group(), dataItem = options.dataItem;

                if (options.dataItem.isIsolated)
                    return g;

                var colorPalette = GetDisplayStatusPalette(dataItem.displayStatus), displayText = dataItem.name.shrinkFromMiddle(18), subText = dataItem.subText;

                // backgroud color
                g.append(new dataviz.diagram.Rectangle({
                    width: 200,
                    height: 50,
                    stroke: {
                        width: 1,
                        color: colorPalette.borderColor
                    },
                    fill: colorPalette.backgroundColor
                }));

                var textGroup = new dataviz.diagram.Group({ x: 10, y: 7 });

                //Main
                textGroup.append(new dataviz.diagram.TextBlock({
                    text: displayText,
                    fontSize: 16,
                    color: "#FFF"
                }));

                //SubText
                textGroup.append(new dataviz.diagram.TextBlock({
                    text: subText,
                    fontSize: 14,
                    y: 20,
                    color: colorPalette.subTextColor
                }));
                g.append(textGroup);

                if (dataItem.truncatedChildrenCount > 0) {
                    var truncatedTextGroup = new dataviz.diagram.Group({ x: 177, y: 26 });

                    truncatedTextGroup.append(new dataviz.diagram.Rectangle({
                        width: 19,
                        height: 20,
                        stroke: {
                            width: 1,
                            color: "#a72129"
                        },
                        fill: "#c52730"
                    }));

                    truncatedTextGroup.append(new dataviz.diagram.TextBlock({
                        x: 6,
                        y: 2,
                        text: dataItem.truncatedChildrenCount,
                        fontSize: 14,
                        color: "#FFF"
                    }));

                    g.append(truncatedTextGroup);
                }

                return g;
            }
            hierarchicalDiagram.visualTemplate = visualTemplate;
        })(dom.hierarchicalDiagram || (dom.hierarchicalDiagram = {}));
        var hierarchicalDiagram = dom.hierarchicalDiagram;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
