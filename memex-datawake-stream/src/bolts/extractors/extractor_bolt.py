from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt



class ExtractorBolt(Bolt):
    """
    ExtractorBolt
    General purprose bot to be used with an python extractor.  to over ride

    class MyBolt(ExtractorBolt):

        def __init__(self):
            ExtractorBolt.__init__(self)
            self.extractor = MyExtractor()

    """

    name ='abstract_extractor'

    auto_anchor = False

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
        for t in tuples:
            try:
                self.log(self.name+" "+t[1])
            except UnicodeEncodeError:
                self.log(self.name+" ascii codec can't encode character")

    def ack(self, tup):
        #self.log("\n"+self.name+" acked tuple")
        Bolt.ack(self,tup)

    def fail(self, tup):
        #self.log("\n"+self.name+" FAILED TUPLE\n")
        Bolt.fail(self,tup)