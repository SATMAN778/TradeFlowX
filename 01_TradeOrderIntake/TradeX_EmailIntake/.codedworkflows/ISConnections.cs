// .codedworkflows/ISConnections.cs — managed by coding agent — regenerate via uipath-rpa skill when connections change.
using UiPath.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.CodedWorkflows;

namespace TradeX_EmailIntake
{
    public class ISConnections
    {
        private readonly ICodedWorkflowsServiceContainer _container;
        public ISConnections(ICodedWorkflowsServiceContainer container) => _container = container;

        public OutlookISConnections Outlook => new(_container);
        public SalesforceISConnections Salesforce => new(_container);
    }

    public class OutlookISConnections
    {
        private readonly ICodedWorkflowsServiceContainer _container;
        public OutlookISConnections(ICodedWorkflowsServiceContainer container) => _container = container;

        // Connection UUID: 5f5cf858-df4e-4dc7-91f7-0b471d4dc011 (satish.prasad@irissoftware.com)
        public ConnectorConnection TradeXEmail =>
            new("5f5cf858-df4e-4dc7-91f7-0b471d4dc011", "uipath-microsoft-outlook365", _container);
    }

    public class SalesforceISConnections
    {
        private readonly ICodedWorkflowsServiceContainer _container;
        public SalesforceISConnections(ICodedWorkflowsServiceContainer container) => _container = container;

        // Connection UUID: f12e2a12-1503-449c-8c76-45e65946d914 (dhanshikaexports.99d55346c0eb@agentforce.com)
        public ConnectorConnection TradeXSalesforce =>
            new("f12e2a12-1503-449c-8c76-45e65946d914", "uipath-salesforce-sfdc", _container);
    }
}
