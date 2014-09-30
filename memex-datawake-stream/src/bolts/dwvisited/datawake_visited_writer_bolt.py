from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt
import datawaketools.entity_data_connector_factory as factory


class DatawakeVisitedWriterBolt(Bolt):
    """

    Process the raw kafka input into tuples for the storm pipeline
    input:   ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
    return:  None

    """


    def initialize(self, storm_conf, context):
        #self.log("STORM_CONF: "+str(storm_conf))
        #self.log("CONTEXT: "+str(context))
        self.entityDataConnector = factory.getEntityDataConnector()


    def process(self, tup):
        (attribute,value,extracted_raw,extracted_metadata,context) = tup.values
        domain = context['domain']
        in_domain = 'y' if self.entityDataConnector.inDomain(domain,attribute,value) else 'n'
        self.entityDataConnector.insertVisitedEntities(context['userId'],context['url'],attribute,[value],in_domain,domain=domain,org=context['org'])






