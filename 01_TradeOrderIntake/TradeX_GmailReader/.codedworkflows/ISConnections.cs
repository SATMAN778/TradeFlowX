// Auto-managed — update via uipath-rpa skill when connections change.
using UiPath.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.CodedWorkflows;

namespace TradeX_GmailReader
{
    public class ISConnections
    {
        private readonly ICodedWorkflowsServiceContainer _container;
        public ISConnections(ICodedWorkflowsServiceContainer container) => _container = container;

        public GmailISConnections Gmail => new(_container);
    }

    public class GmailISConnections
    {
        private readonly ICodedWorkflowsServiceContainer _container;
        public GmailISConnections(ICodedWorkflowsServiceContainer container) => _container = container;

        // Connection UUID: e37563f3-b8d7-4167-a518-ee3999cc1c4b (rpabotsworld@gmail.com, Shared folder)
        public ConnectorConnection TradeXGmail =>
            new("e37563f3-b8d7-4167-a518-ee3999cc1c4b", "uipath-google-gmail", _container);
    }
}
