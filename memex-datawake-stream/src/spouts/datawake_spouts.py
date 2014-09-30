from __future__ import absolute_import, print_function, unicode_literals

import itertools
from streamparse.spout import Spout

class DatawakeVisitedSpout(Spout):

    def initialize(self, stormconf, context):
        self.data = itertools.cycle([
            ['1','MEMEXDEMO','wizzards','123456','hello.com','my email is hello@hithere.com and my phone is 369five11six917'],
            ['2','MEMEXDEMO','wizzards','123456','goodbye.com','my email is goodbye@imout.com and my phone is 369*fiveoneonesix917 i have a website <a href="http://www.here.com" ><a>'],
        ])


    def next_tuple(self):
        """
        input:  (timestamp,org,domain,user_id,url,html)
        :return:  (url, status, headers, flags, body, timestamp, source,context)
        """
        (timestamp,org,domain,user_id,url,html) = next(self.data)
        context = {
            'source':'datawake-visited',
            'userId':user_id,
            'org':org,
            'domain':domain,
            'url':url
        }
        self.emit([url,'','','',html,timestamp,context['source'],context])
