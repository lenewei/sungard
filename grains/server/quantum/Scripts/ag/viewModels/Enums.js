var ag;
(function (ag) {
    (function (HTTPType) {
        HTTPType[HTTPType["POST"] = 0] = "POST";
        HTTPType[HTTPType["GET"] = 1] = "GET";
    })(ag.HTTPType || (ag.HTTPType = {}));
    var HTTPType = ag.HTTPType;

    (function (RuleType) {
        RuleType[RuleType["UpdateCellDisplay"] = 0] = "UpdateCellDisplay";
        RuleType[RuleType["DisableTheDrillDownAfterSelection"] = 1] = "DisableTheDrillDownAfterSelection";
        RuleType[RuleType["UpdateStyle"] = 2] = "UpdateStyle";
    })(ag.RuleType || (ag.RuleType = {}));
    var RuleType = ag.RuleType;

    (function (ViewType) {
        ViewType[ViewType["DataView"] = 0] = "DataView";
        ViewType[ViewType["Crystal"] = 1] = "Crystal";
        ViewType[ViewType["Pivot"] = 2] = "Pivot";
        ViewType[ViewType["Chart"] = 3] = "Chart";
    })(ag.ViewType || (ag.ViewType = {}));
    var ViewType = ag.ViewType;

    (function (HierarchicalCopyMode) {
        HierarchicalCopyMode[HierarchicalCopyMode["Item"] = 0] = "Item";
        HierarchicalCopyMode[HierarchicalCopyMode["Group"] = 1] = "Group";
    })(ag.HierarchicalCopyMode || (ag.HierarchicalCopyMode = {}));
    var HierarchicalCopyMode = ag.HierarchicalCopyMode;

    (function (GroupTransactor) {
        GroupTransactor[GroupTransactor["None"] = 0] = "None";
        GroupTransactor[GroupTransactor["Group"] = 1] = "Group";
        GroupTransactor[GroupTransactor["Transaction"] = 2] = "Transaction";
    })(ag.GroupTransactor || (ag.GroupTransactor = {}));
    var GroupTransactor = ag.GroupTransactor;

    (function (DealMapMode) {
        DealMapMode[DealMapMode["Init"] = -1] = "Init";
        DealMapMode[DealMapMode["None"] = 0] = "None";
        DealMapMode[DealMapMode["Profiler"] = 1] = "Profiler";
        DealMapMode[DealMapMode["Customizer"] = 2] = "Customizer";
        DealMapMode[DealMapMode["Scheduler"] = 3] = "Scheduler";
    })(ag.DealMapMode || (ag.DealMapMode = {}));
    var DealMapMode = ag.DealMapMode;

    (function (ViewRequestType) {
        ViewRequestType[ViewRequestType["CreateTypeView"] = 0] = "CreateTypeView";
        ViewRequestType[ViewRequestType["SaveTypeView"] = 1] = "SaveTypeView";
        ViewRequestType[ViewRequestType["EditView"] = 2] = "EditView";
    })(ag.ViewRequestType || (ag.ViewRequestType = {}));
    var ViewRequestType = ag.ViewRequestType;

    (function (GridStyleType) {
        GridStyleType[GridStyleType["Default"] = 0] = "Default";
        GridStyleType[GridStyleType["NotAvailable"] = 1] = "NotAvailable";
        GridStyleType[GridStyleType["Important"] = 2] = "Important";
        GridStyleType[GridStyleType["Error"] = 3] = "Error";
        GridStyleType[GridStyleType["FolderIcon"] = 4] = "FolderIcon";

        //ItemIcon,
        GridStyleType[GridStyleType["Pending"] = 5] = "Pending";
        GridStyleType[GridStyleType["Indent1"] = 6] = "Indent1";
        GridStyleType[GridStyleType["Indent2"] = 7] = "Indent2";
        GridStyleType[GridStyleType["Indent3"] = 8] = "Indent3";
        GridStyleType[GridStyleType["Indent4"] = 9] = "Indent4";
        GridStyleType[GridStyleType["Indent5"] = 10] = "Indent5";
        GridStyleType[GridStyleType["Indent6"] = 11] = "Indent6";
        GridStyleType[GridStyleType["Indent7"] = 12] = "Indent7";
        GridStyleType[GridStyleType["Indent8"] = 13] = "Indent8";
        GridStyleType[GridStyleType["Indent9"] = 14] = "Indent9";
        GridStyleType[GridStyleType["Indent10"] = 15] = "Indent10";
    })(ag.GridStyleType || (ag.GridStyleType = {}));
    var GridStyleType = ag.GridStyleType;

    // Client-side equivalent of RoundTypeEnum
    (function (RoundType) {
        RoundType[RoundType["notApplicable"] = 0] = "notApplicable";
        RoundType[RoundType["none"] = 10210001] = "none";
        RoundType[RoundType["fiveFour"] = 10210002] = "fiveFour";
        RoundType[RoundType["up"] = 10210003] = "up";
        RoundType[RoundType["down"] = 10210004] = "down";
    })(ag.RoundType || (ag.RoundType = {}));
    var RoundType = ag.RoundType;
})(ag || (ag = {}));
