
/// <reference path="../simpleViewModel.ts" />

module ag
{
    export class HomeViewModel extends  SimpleViewModel
    {
        private adhocViewModel: ag.AdhocReportingViewModel;
        private adhocUrl: KnockoutComputed<string>;
        private adhocViewerLoading: KnockoutComputed<boolean>;

        init(itemModel: any)
        {
            super.init(itemModel);
            this.adhocViewModel = new AdhocReportingViewModel(this.options);
            this.adhocViewModel.init(itemModel.landingPage, this);

            this.adhocUrl = ko.computed(() => {
                return this.adhocViewModel.adhocUrl();
            }).extend({ notify: 'always' });

            this.adhocViewerLoading = ko.computed(() => {
                return this.adhocViewModel.adhocViewerLoading();
            });

        }

        afterApplyBindings()
        {
            var createPayload = (action: Action) =>
            {
                if (action)
                {
                    action.createCustomPayload = () =>
                    {
                        return {
                            landingPage: this.adhocViewModel.currentReport()
                        };
                    }
                 }
            };
           createPayload(<Action>this.actions.removeLandingPage);
        }
        adhocLoaded()
        {
            this.adhocViewModel.adhocLoaded();
        }

        adhocError(reasons: any)
        {
            this.adhocViewModel.adhocError(reasons);
        }

        landingPageRequest(name): JQueryPromise<any>
        {
            return this.net.postJson('setLandingPage', { landingPage: name }).then(
                (result) =>
                {
                    var info = result.Data;
                    if (info)
                    {
                        this.adhocViewModel.setQuery(info);
                    }
                });
        }

    }
}

