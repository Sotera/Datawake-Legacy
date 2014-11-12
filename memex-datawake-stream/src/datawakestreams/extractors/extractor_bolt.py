from __future__ import absolute_import, print_function, unicode_literals
import traceback
from streamparse.bolt import Bolt
from datawakestreams import all_settings
from datawakeio import factory as factory

class ExtractorBolt(Bolt):
    """
    ExtractorBolt
    General purpose bolt to be used with an python extractor.  to override

    class MyBolt(ExtractorBolt):

        def __init__(self):
            ExtractorBolt.__init__(self)
            self.extractor = MyExtractor()

    """

    name ='abstract_extractor'

    auto_anchor = False


    def initialize(self,storm_conf, context):
        try:

            settings = all_settings.get_settings(storm_conf['topology.deployment'])
            self.conf = settings
            self.connector = factory.getEntityDataConnector(self.conf)
        except:
            self.log(traceback.format_exc(),level='error')
            raise


    def process(self, tup):
        """
        Process the input using a standard feature extractor  see extractor.py
        :param tup:   (url, status, headers, flags, body, timestamp, source,context)
        :return:    (attribute,value,extracted_raw,extracted_metadata,context)
        """
        (url, status, headers, flags, body, timestamp, source,context) = tup.values
        tuples = self.extractor.extract(url, status, headers, flags, body, timestamp, source)
        tuples = map(lambda x: x.to_list(),tuples)
        for t in tuples:
            t.append(context)
        if len(tuples) > 0:
            self.emit_many(tuples)
            self.log(self.name+" emited "+str(len(tuples))+" from url: "+url.encode('utf-8'),level='debug')

            values = map(lambda x: x[1],tuples)
            type = tuples[0][0]
            self.connector.insert_entities(context['url'], type, values)
            self.log("WROTE attribute: "+type+" values: "+str(values))






    def ack(self, tup):
        Bolt.ack(self,tup)
        #(url, status, headers, flags, body, timestamp, source,context) = tup.values
        #safeurl = url.encode('utf-8','ignore')
        #self.log(self.name+" acked tuple url: "+safeurl)


    def fail(self, tup):
        self.log("\n"+self.name+" FAILED TUPLE\n",level='error')
        Bolt.fail(self,tup)