var ag;
(function (ag) {
    (function (constants) {
        "use strict";

        //#region Public constants
        //#region Filter operators
        constants.OperatorType = {
            EqualTo: 0,
            LessThan: 1,
            GreaterThan: 2,
            Between: 3,
            OneOf: 4,
            Contains: 5,
            OneOfData: 6,
            Not: 1024,
            NotEqualTo: 1024,
            NotLessThan: 1025,
            NotGreaterThan: 1026,
            NotBetween: 1027,
            NotOneOf: 1028,
            DoesNotContain: 1029,
            NotOneOfData: 1030
        };

        //#endregion
        //#endregion
        // Default dates to be used by the date picker
        constants.MinimumDate = new Date(1899, 0, 1);
        constants.MaximumDate = new Date(4712, 11, 31);

        constants.ReportMode = {
            Continue: 0,
            Halt: 1,
            Abort: 2
        };

        constants.SortStrategy = {
            None: 0,
            Ascending: 1,
            Descending: 2
        };

        constants.PivotOperator = {
            None: 0,
            Count: 1,
            Sum: 2,
            RunningSum: 3,
            ReverseRunningSum: 4,
            Max: 5,
            Min: 6,
            Mean: 7,
            MeanExcludingZero: 8,
            First: 9,
            Last: 10,
            List: 11
        };

        constants.GuidDefault = '00000000-0000-0000-0000-000000000000';
    })(ag.constants || (ag.constants = {}));
    var constants = ag.constants;
})(ag || (ag = {}));
