from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt
import json
from kafka.client import KafkaClient
from kafka.producer import SimpleProducer
import uuid
from datawakestreams import all_settings
import traceback


class CrawlerQueueWriter(Bolt):
    """
    Write urls to the crawler queue

    output:
     JSON
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

    """

    appid = ''
    topic = ''
    conn_pool = ''


    def initialize(self,storm_conf, context):
        try:
            self.log("CrawlerQueueWriter INIT")
            settings = all_settings.get_settings(storm_conf['topology.deployment'])
            self.appid = settings['appid']
            self.topic = settings['crawler-in-topic'].encode()
            self.conn_pool = settings['conn_pool'].encode()
            self.log('CrawlerQueueWriter initialized with topic ='+self.topic+' conn_pool='+self.conn_pool)
            self.kafka = KafkaClient(self.conn_pool)
            self.producer = SimpleProducer(self.kafka, async=False)
        except:
            self.log("CrawlerQueueWriter initialize error",level='error')
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
        (attribute,url,extracted_raw,extracted_metadata,context) = tup.values


        output = json.dumps(dict(
            id = str(uuid.uuid4()),
            appid = self.appid,
            url = url,
            priority = 50,
            depth = 0,
            attrs  = dict(
                userId = context['userId'],
                org =  context['org'],
                domain = context['domain']
            )
        ))
        self.producer.send_messages(self.topic, output)
        #self.log("crawl_queue_writer Sent url to crawler: "+url)


