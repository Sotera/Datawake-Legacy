from kafka.client import KafkaClient
from kafka.producer import SimpleProducer
import datawakeconfig
from datetime import datetime


"""
Simple producer to write to a kafka queue, uses: https://github.com/mumrah/kafka-python

Tangelo Note / WARNING  Tangelo appears to have a problem closing threads when done, if you create a new producer
for each web request a new process will start each time and they never close, eventually the server crashes
because it can't open any more.  Instead i use a constant in this file to keep a single producer loaded in memory for use.


"""

class KafkaProducer:

    def __init__(self,conn_pool,topic):
        self.conn_pool = conn_pool
        self.topic = topic
        self.kafka = KafkaClient(self.conn_pool)
        self.producer = SimpleProducer(self.kafka, async=True)

    def send(self,message):
        self.producer.send_messages(self.topic, message)

    def sendBulk(self,messages):
        self.producer.send_messages(self.topic, *messages)

    def close(self):
        self.producer.stop()
        self.kafka.close()
        self.kafka = None
        self.producer = None


LOOKAHEAD_PRODUCER = None
VISITING_PRODUCER = None



def sendLookaheadMessages(org,domain,messages):
    global LOOKAHEAD_PRODUCER
    if LOOKAHEAD_PRODUCER is None:
        LOOKAHEAD_PRODUCER = KafkaProducer(datawakeconfig.KAFKA_CONN_POOL,datawakeconfig.KAFKA_LOOKAHEAD_TOPIC)

    dt = datetime.utcnow().strftime("%s")
    messages = map(lambda x: dt+'\0'+org+'\0'+domain+'\0'+x.replace('\0',''),messages)

    LOOKAHEAD_PRODUCER.sendBulk(messages)



def sendVisitingMessage(org,domain,userId,url,html):
    global VISITING_PRODUCER
    if VISITING_PRODUCER is None:
        VISITING_PRODUCER = KafkaProducer(datawakeconfig.KAFKA_CONN_POOL,datawakeconfig.KAFKA_VISITING_TOPIC)
    message = []

    message.append(datetime.utcnow().strftime("%s"))
    message.append(org)
    message.append(domain)
    message.append(userId)
    message.append(url)
    message.append(html)

    message = map(lambda x: x.replace('\0',''),message)
    message = '\0'.join(message)

    VISITING_PRODUCER.send(message)



