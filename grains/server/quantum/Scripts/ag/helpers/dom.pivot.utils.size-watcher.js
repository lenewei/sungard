var ag;
(function (ag) {
    (function (dom) {
        (function (pivot) {
            var _documentWidth = 0, _documentHeight = 0;

            function documentSizeHasChanged() {
                var width = $(document).width(), height = $(document).height();

                if (width !== _documentWidth || height !== _documentHeight)
                    return true;

                return false;
            }
            pivot.documentSizeHasChanged = documentSizeHasChanged;

            function updateDocumentSize() {
                _documentWidth = $(document).width();
                _documentHeight = $(document).height();
                ;
            }
            pivot.updateDocumentSize = updateDocumentSize;
        })(dom.pivot || (dom.pivot = {}));
        var pivot = dom.pivot;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
