
/// <reference path="../simpleViewModel.ts" />

module ag
{
    export class AdhocReportingViewModel extends SimpleViewModel
    {

        private query = ko.observable();
        private currentQuery: string;
        private parent: SimpleViewModel;

        isReport: KnockoutComputed<boolean>;

        adhocUrl: KnockoutComputed<string>;
        adhocViewerLoading = ko.observable(false);

        init(itemModel: any, parent?: any)
        {
            super.init(itemModel);
            this.parent = parent;

            this.updatePageTitle("");

            this.adhocViewerLoading(this.editingItem.displayAdhoc());

            this.adhocUrl = ko.computed(() =>
            {
                return this.editingItem.displayAdhoc() && this.editingItem.reportUrl() ? "{0}/{1}".format(this.editingItem.reportUrl(), this.query()) : null;
            }).extend({ notify: 'always' });

            this.isReport = ko.computed(() =>
            {
                return ko.unwrap(this.editingItem.currentQuery) ? !!ko.unwrap(this.editingItem.reportId) : false;
            });

            if (itemModel.reportParameters)
            {
                this.query('?' + $.param(ko.unwrap(itemModel.reportParameters)));
            };

            window.addEventListener("message", this.receiveMessage.bind(this), false);

            $(document.body).toggleClass("hide-container", !this.editingItem.displayAdhoc());

        }

        adhocLoaded()
        {
            this.adhocViewerLoading(false);
        }

        adhocError(reasons: any)
        {
            this.adhocViewerLoading(false);
        }

        setQuery(value: string)
        {
            this.query(value);
        }

        currentReport(): string
        {
            return ko.unwrap(this.editingItem.reportId);
        }

        private resetQuery(): void
        {
            if (ko.unwrap(this.query))
            {
                this.query(null);
            }
            else
            {
                this.query.valueHasMutated();
            }
        }

        afterApplyBindings()
        {
            var modifyInvoke = (action: Action) =>
            {
                if (action)
                {
                    action.invoke = (app, event, complete) =>
                    {
                        this.resetQuery();
                        complete();
                        return complete;
                    }
                 }
            };
            modifyInvoke(<Action>this.actions.reportManagement);
        }

        private receiveMessage(event)
        {
            if (event.data && window.location.search != event.data)
            {
                var data = $.isPlainObject(event.data) ? event.data : $.parseJSON(event.data);
                if (!data.query) return;

                var editingItem = this.editingItem;
                editingItem.reportName(data.name);
                editingItem.reportId(data.id);
                editingItem.reportTitle(data.title);

                if (this.editingItem.showQueryString()) 
                {
                    (<any>History).replaceState('', '', data.query);
                }
                else
                {
                    this.updatePageTitle(this.editingItem.reportName());
                }

                editingItem.currentQuery(data.query);

            }
        }

        private updatePageTitle(title?: string)
        {
            var viewModel = this.parent || this;
            (<any>viewModel).pageTitle.removeAll();
            (<any>viewModel).pageTitle.push({ keyProperty: title });
        }


        private getParameterByName(name: string, querystring: string)
        {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(querystring);
            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }

    }

}

