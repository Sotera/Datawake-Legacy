from __future__ import absolute_import, print_function, unicode_literals
from kafka.client import KafkaClient
from kafka.consumer import SimpleConsumer
from streamparse.spout import Spout
import sys
import json
from datawakestreams import all_settings
import traceback


class CrawlerSpout(Spout):

    group = 'datawake-crawler-in-consumer'.encode()


    def initialize(self, stormconf, context):
        try:
            settings = all_settings.get_settings(stormconf['topology.deployment'])
            self.topic = settings['crawler-in-topic'].encode()
            self.conn_pool = settings['conn_pool'].encode()
            self.log('CrawlerSpout initialized with topic ='+self.topic+' conn_pool='+self.conn_pool)
            self.kafka = KafkaClient(self.conn_pool)
            self.consumer = SimpleConsumer(self.kafka,self.group,self.topic,max_buffer_size=None)
            self.consumer.seek(0,2) # move to the tail of the queue
        except:
            self.log("CrawlerSpout initialize error",level='error')
            self.log(traceback.format_exc(),level='error')
            raise

    def next_tuple(self):
        """
        input message:
             json.dumps(dict(
                    id = 'abcdefg', #TODO generate UUID,
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
        :return:
        """

        offsetAndMessage = self.consumer.get_messages(timeout=None)[0]
        message = offsetAndMessage.message.value
        to_crawl = json.loads(message)
        self.emit([to_crawl])



