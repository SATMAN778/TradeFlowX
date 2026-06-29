using UiPath.IntegrationService.Activities.Runtime.CodedWorkflows;
using UiPath.CodedWorkflows;

namespace TradeX_POEnrichment
{
    public class ISConnections
    {
        private readonly ICodedWorkflowsServiceContainer _container;
        public ISConnections(ICodedWorkflowsServiceContainer container) => _container = container;
        public SalesforceISConnections Salesforce => new(_container);
    }

    public class SalesforceISConnections
    {
        private readonly ICodedWorkflowsServiceContainer _container;
        public SalesforceISConnections(ICodedWorkflowsServiceContainer container) => _container = container;

        // Salesforce IS connection in Shared folder
        public ConnectorConnection TradeXSalesforce =>
            new("64a5d0e7-d4e0-4258-8f8c-e0b2ebc01cd1", "uipath-salesforce-sfdc", _container);
    }
}
