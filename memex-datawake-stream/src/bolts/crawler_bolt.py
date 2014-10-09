from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt
import datetime
import operator
import time
import urllib2
import traceback
import json

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
        :input
                    {
                        "id": "575973a6-8636-42dd-87a9-4151384242a1",   # item UUID for tracking
                        "appid": "datawake",                            # application ID; output written to crawled_{appid}
                        "url": "http://www.dmoz.org/Business/",         # URL string
                        "priority": 100,                                # optional, 1-100, 1 is highest -- may be ignored for now
                        "depth": 0,                                     # optional, 0-3, crawling depth -- may be ignored for now
                        "allowed_domains": ["dmoz.org"],                # optional, which domains to follow for links -- may be ignored for now
                        "attrs": {                                      # optional, arbitrary attributes to pass-through crawl
                            "foo": "bar"
                        }
                    }

        :output
                    {
                        "id": "575973a6-8636-42dd-87a9-4151384242a1",   # item UUID for tracking
                        "url": "http://www.dmoz.org/Business/",         # URL string
                        "status_code": "200",                           # error code of crawled page
                        "status_msg": "Success",                        # log information from crawler
                        "timestamp": "2014-10-04T08:00:000Z",           # timestamp of page (may be cached)
                        "links_found": [                                # links found by extractor
                            "http://www.dmoz.org/Business/Accounting/",
                            "http://www.dmoz.org/Business/Employment/",
                            "..."
                        ],
                        "raw_html": "\x01...\x01",                      # raw HTML encoded somehow (base64, gzip, ...?)
                        "attrs": {                                      # arbitrary attributes to pass-through crawl
                            "foo": "bar"
                         }
                    }

        """

        input = json.loads(tup.values[0])

        url = input['url']

        now = datetime.datetime.now()
        if url in self.seen:
            lastSeen = self.seen[url]
            delta = now - lastSeen
            if delta.total_seconds() < 3600:
                # seen less than an hour ago, don't fetch again
                self.log("CrawlerBolt ignoring "+url+" last seen"+str(delta.total_seconds()))
                return
        self.seen[url] = now

        delta = now - self.lastfetch
        if delta.total_seconds < 0.25:
            self.log("CrawlerBolt sleeping")
            time.sleep(.25)


        self.log("CrawlerBolt fetching: "+url)
        opener = urllib2.build_opener()
        headers = [("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0")]
        opener.addheaders = headers
        try:
            response = opener.open(url)
            html = response.read()#.encode('ascii', 'ignore')

            output = {
                'id': input['id'],
                'url': url,
                'status_code': response.getcode(),
                'status_msg': 'Success',
                "timestamp": response.info()['date'],
                "links_found": [], # TODO
                "raw_html" : html,
                "attrs": input['attrs']
            }

            self.emit([json.dumps(output)])

            self.log("CrawlerBolt fetched: "+url+" status: "+str(response.getcode()))
            self.lastfetch = datetime.datetime.now()
        except:
            self.log("error fetching url: "+value)
            self.log(traceback.format_exc())


        if len(self.seen) > self.MAX_LRU_SIZE:
            self.log("CrawlerBolt truncating LRU cache")
            sorted_x = sorted(self.seen.items(), key=operator.itemgetter(1))[0:self.TRUNCATE]
            self.seen = dict(sorted_x)








