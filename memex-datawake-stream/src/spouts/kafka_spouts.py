from __future__ import absolute_import, print_function, unicode_literals
from kafka.client import KafkaClient
from kafka.consumer import SimpleConsumer
from streamparse.spout import Spout
import sys




class KafkaConsumer:
    """
    Simple Kafka consumer
    """
    group = "python-lookahead-consumer"

    def __init__(self,conn_pool,topic):
        self.conn_pool = conn_pool
        self.topic = topic
        self.kafka = KafkaClient("localhost:9092")
        self.consumer = SimpleConsumer(self.kafka,"python-lookahead-consumer","memex-datawake-visited",max_buffer_size=None)
        self.consumer.seek(0,2) # move to the tail of the queue

    def next(self):
        offsetAndMessage = self.consumer.get_messages(timeout=None)[0]
        message = offsetAndMessage.message.value
        return message



class KafkaDatawakeVisitedSpout(Spout):

    def __init__(self):
        Spout.__init__(self)
        self.queue = None

    def initialize(self, stormconf, context):
        # TODO move into config
        self.queue = KafkaConsumer("localhost:9092",'memex-datawake-visited')


    def next_tuple(self):
        """
        input:  (timestamp,org,domain,user_id,url,html)
        :return:  (url, status, headers, flags, body, timestamp, source,context)
        """

        message = self.queue.next().split('\0')
        (timestamp,org,domain,userId,url,html) = message
        context = {
            'source':'datawake-visited',
            'userId':user_id,
            'org':org,
            'domain':domain,
            'url':url
        }
        self.emit([url,'','','',html,timestamp,context['source'],context])


