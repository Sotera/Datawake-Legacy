from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt
import datetime
import operator
import time
import urllib2
import traceback

class CrawlerBolt(Bolt):
    """
    WriterBolt

    """

    MAX_LRU_SIZE = 1000
    TRUNCATE = 750


    def __init__(self):
        Bolt.__init__(self)
        self.seen = {}
        self.lastfetch = datetime.datetime.now()



    def process(self, tup):
        """
        Writes the input out to a local file
        :param tup:   ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
        :return:     ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]

        context = {
            'source':'datawake-visited',
            'userId':user_id,
            'org':org,
            'domain':domain,
            'url':url
        }

        """
        (attribute, value, extracted_raw, extracted_metadata,context) = tup.values

        if attribute != 'website' and context['source'] != 'datawake-visited':
            return

        context['source'] = 'datawake-lookahead'
        now = datetime.datetime.now()
        if value in self.seen:
            lastSeen = self.seen[value]
            delta = now - lastSeen
            if delta.total_seconds() < 3600:
                # seen less than an hour ago, don't fetch again
                self.log("CrawlerBolt ignoring "+value+" last seen"+str(delta.total_seconds()))
                return
        self.seen[value] = now

        delta = now - self.lastfetch
        if delta.total_seconds < 0.25:
            self.log("CrawlerBolt sleeping")
            time.sleep(.25)


        self.log("CrawlerBolt fetching: "+value)
        opener = urllib2.build_opener()
        headers = [("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0")]
        opener.addheaders = headers
        try:
            response = opener.open(value)
            html = response.read()#.encode('ascii', 'ignore')
            self.emit([value,
                       str(response.getcode()),
                       str(response.info().items()),
                       '',html,str(int(time.time())),
                       'datawake-lookahead',
                       context])
            self.log("CrawlerBolt fetched: "+value+" status: "+str(response.getcode()))
            self.lastfetch = datetime.datetime.now()
        except:
            self.log("error fetching url: "+value)
            self.log(traceback.format_exc())




            if len(self.seen) > self.MAX_LRU_SIZE:
                self.log("CrawlerBolt truncating LRU cache")
                sorted_x = sorted(self.seen.items(), key=operator.itemgetter(1))[0:self.TRUNCATE]
                self.seen = dict(sorted_x)








