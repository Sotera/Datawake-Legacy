from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt
from datawakestreams import all_settings
from datawakeio import factory as factory
import traceback


FILENAME = '/vagrant/memex-datawake-stream/testout.csv'

class DomainWriterBolt(Bolt):
    """
    WriterBolt

    For local testing only, write output to a local file

    """

    def __init__(self):
        Bolt.__init__(self)


    def initialize(self,storm_conf, context):
        try:
            self.log("WriterBolt INIT")
            settings = all_settings.get_settings(storm_conf['topology.deployment'])
            self.conf = settings
            self.connector = factory.getEntityDataConnector(self.conf)
        except:
            self.log("WriterBolt initialize error",level='error')
            self.log(traceback.format_exc(),level='error')
            raise


    def process(self, tup):
        """
        Writes the input out to a local file
        :param tup:   (attribute,value,extracted_raw,extracted_metadata,context)
        :return:    None

        context = {
            'source':'datawake-visited',
            'userId':user_id,
            'org':org,
            'domain':domain,
            'url':url
        }

        """
        (attribute,value,extracted_raw,extracted_metadata,context) = tup.values
        domainValues = self.connector.get_domain_entity_matches( context['domain'], attribute, [value])
        if len(domainValues) > 0:
            self.connector.insert_domain_entities( context['domain'],context['url'],attribute,domainValues)
            self.log("WROTE to DOMAIN attribute: "+attribute+" value: "+value)



