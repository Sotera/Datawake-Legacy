from __future__ import absolute_import, print_function, unicode_literals
from kafka.client import KafkaClient
from kafka.consumer import SimpleConsumer
from streamparse.spout import Spout
import sys
import json
from datawakestreams import all_settings
import traceback



class KafkaDatawakeVisitedSpout(Spout):

    group = 'datawake-visited-consumer'.encode()

    def __init__(self):
        Spout.__init__(self)
        self.queue = None

    def initialize(self, stormconf, context):
        try:
            settings = all_settings.get_settings(stormconf['topology.deployment'])
            self.topic = settings['visited-topic'].encode()
            self.conn_pool = settings['conn_pool'].encode()
            self.log('KafkaDatawakeVisitedSpout initialized with topic ='+self.topic+' conn_pool='+self.conn_pool)
            self.kafka = KafkaClient(self.conn_pool)
            self.consumer = SimpleConsumer(self.kafka,self.group,self.topic,max_buffer_size=None)
            self.consumer.seek(0,2) # move to the tail of the queue
        except:
            self.log("KafkaDatawakeVisitedSpout initialize error",level='error')
            self.log(traceback.format_exc(),level='error')
            raise


    def next_tuple(self):
        """
        input:  (timestamp,org,domain,user_id,url,html)
        :return:  (url, status, headers, flags, body, timestamp, source,context)
        """
        offsetAndMessage = self.consumer.get_messages(timeout=None)[0]
        message = offsetAndMessage.message.value
        message = message.decode('utf-8')
        message = message.split('\0')
        (timestamp,org,domain,userId,url,html) = message
        context = {
            'source':'datawake-visited',
            'userId':userId,
            'org':org,
            'domain':domain,
            'url':url
        }
        self.emit([url,'','','',html,timestamp,context['source'],context])




class KafkaDatawakeLookaheadSpout(Spout):

    group = 'datawake-crawler-out-consumer'.encode()

    def __init__(self):
        Spout.__init__(self)
        self.queue = None

    def initialize(self, stormconf, context):
        try:
            settings = all_settings.get_settings(stormconf['topology.deployment'])
            self.topic = settings['crawler-out-topic'].encode()
            self.conn_pool = settings['conn_pool'].encode()
            self.log('KafkaDatawakeLookaheadSpout initialized with topic ='+self.topic+' conn_pool='+self.conn_pool)
            self.kafka = KafkaClient(self.conn_pool)
            self.consumer = SimpleConsumer(self.kafka,self.group,self.topic,max_buffer_size=None)
            self.consumer.seek(0,2) # move to the tail of the queue
        except:
            self.log("KafkaDatawakeLookaheadSpout initialize error",level='error')
            self.log(traceback.format_exc(),level='error')
            raise


    def next_tuple(self):
        """
        input message:
            dict(
                 id = input['id'],
                 appid = input['appid'],
                 url = url,
                 status_code = response.getcode(),
                 status_msg = 'Success',
                 timestamp = response.info()['date'],
                 links_found = links,
                 raw_html =  html,
                 attrs = input['attrs']
            )
        :return:  (url, status, headers, flags, body, timestamp, source,context)
        """

        offsetAndMessage = self.consumer.get_messages(timeout=None)[0]
        message = offsetAndMessage.message.value

        crawled = json.loads(message)
        safeurl = crawled['url'].encode('utf-8','ignore')
        self.log("Lookahead spout received id: "+crawled['id']+" url: "+safeurl)
        context = {
            'source':'datawake-lookahead',
            'userId':crawled['attrs']['userId'],
            'org':crawled['attrs']['org'],
            'domain':crawled['attrs']['domain'],
            'url':crawled['url']
        }
        self.emit([crawled['url'],crawled['status_code'],'','',crawled['raw_html'],crawled['timestamp'],context['source'],context])



