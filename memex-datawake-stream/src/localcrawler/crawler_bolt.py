from __future__ import absolute_import, print_function, unicode_literals
import datetime
import operator
import time
import urllib2
import traceback
import json

from streamparse.bolt import Bolt
from kafka.client import KafkaClient
from kafka.producer import SimpleProducer

from extractors.extract_website import ExtractWebsite
from datawakestreams import all_settings


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
        self.linkExtractor = ExtractWebsite()


    def initialize(self, storm_conf, context):
        try:
            self.log("CrawlerBolt INIT")
            settings = all_settings.get_settings(storm_conf['topology.deployment'])
            self.topic = settings['crawler-out-topic'].encode()
            self.conn_pool = settings['conn_pool'].encode()
            self.log('CrawlerQueueWriter initialized with topic =' + self.topic + ' conn_pool=' + self.conn_pool)
            self.kafka = KafkaClient(self.conn_pool)
            self.producer = SimpleProducer(self.kafka, async=False)
        except:
            self.log("CrawlerBolt initialize error", level='error')
            self.log(traceback.format_exc(), level='error')
            raise


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

        input = tup.values[0]

        url = input['url']

        now = datetime.datetime.now()
        if url in self.seen:
            lastSeen = self.seen[url]
            delta = now - lastSeen
            if delta.total_seconds() < 3600:
                # seen less than an hour ago, don't fetch again
                return
        self.seen[url] = now

        delta = now - self.lastfetch
        if delta.total_seconds < 0.25:
            # self.log("CrawlerBolt sleeping")
            time.sleep(.25)

        opener = urllib2.build_opener()
        headers = [("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0")]
        opener.addheaders = headers
        output = None
        try:
            response = opener.open(url)
            self.log(response.info().getheader('Content-Type'))
            content_type = response.info().getheader('Content-Type')
            decode_type = "utf-8"
            if "charset" in content_type:
                decode_type = content_type.split("charset=")[-1]
            html = response.read().decode(decode_type)

            links = self.linkExtractor.extract(url, response.getcode(), '', '', html, response.info()['date'], 'datawake-local-crawler')
            links = map(lambda x: x.value, links)
            links = filter(lambda x: x is not None and len(x) > 0, links)
            # self.log("CrawlerBolt extracted links: "+str(links))

            output = dict(
                crawlid=input['crawlid'],
                appid=input['appid'],
                url=url,
                status_code=response.getcode(),
                status_msg='Success',
                timestamp=response.info()['date'],
                links_found=links,
                body=html,
                attrs=input['attrs']
            )


            #self.emit([json.dumps(output)])
            self.producer.send_messages(self.topic, json.dumps(output))

            self.lastfetch = datetime.datetime.now()
        except:
            self.log("CrawlerBolt " + traceback.format_exc())
            self.log("CrawlerBolt: URL: " + url)
            # self.fail(tup)

        if len(self.seen) > self.MAX_LRU_SIZE:
            self.log("CrawlerBolt truncating LRU cache", level='trace')
            sorted_x = sorted(self.seen.items(), key=operator.itemgetter(1))[0:self.TRUNCATE]
            self.seen = dict(sorted_x)


