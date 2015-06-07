/// <reference path="../../ts/global.d.ts" />

module ag
{
	"use strict";

	function decorateValue(value: any)
	{
            value.valueIsUnvalidated = false;

            return ko.computed(
            {
		read: value,
		write: (v) =>
		{
			value.valueIsUnvalidated = true;
			value(v);
		}
            });
	}

	ko.bindingHandlers["filterValue"] = 
	{
		init: (element, valueAccessor) =>
		{
			var value = valueAccessor();
			if (!ko.isObservable(value))
				throw new Error("value must be an observable");

			ko.applyBindingsToNode(element, { value: decorateValue(value) });
		}
	};
}