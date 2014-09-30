from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt




class DatawakeVisitedKafkaBolt(Bolt):
    """

    Process the raw kafka input into tuples for the storm pipeline
    input:  (timestamp,org,domain,user_id,url,html)
    return:  (url, status, headers, flags, body, timestamp, source,context)

    """

    auto_anchor = False

    def initialize(self, storm_conf, context):
        #self.log("STORM_CONF: "+str(storm_conf))
        #self.log("CONTEXT: "+str(context))
        pass


    def process(self, tup):
        (timestamp,org,domain,user_id,url,html) = tup.values[0].split('\0')
        self.log('tiemstamp: '+timestamp)
        self.log('url: '+url)
        context = {
            'source':'datawake-visited',
            'userId':user_id,
            'org':org,
            'domain':domain,
            'url':url
        }
        self.emit([url,'','','',html,timestamp,context['source'],context])

