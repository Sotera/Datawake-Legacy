from datetime import datetime

from kafka.client import KafkaClient
from kafka.producer import SimpleProducer

from datawake.conf import datawakeconfig


"""
Simple producer to write to a kafka queue, uses: https://github.com/mumrah/kafka-python

Tangelo Note / WARNING  Tangelo appears to have a problem closing threads when done, if you create a new producer
for each web request a new process will start each time and they never close, eventually the server crashes
because it can't open any more.  Instead i use a constant in this file to keep a single producer loaded in memory for use.


"""


class KafkaProducer:
    def __init__(self, conn_pool, topic):
        self.conn_pool = conn_pool
        self.topic = topic
        self.kafka = KafkaClient(self.conn_pool)
        self.kafka.ensure_topic_exists(self.topic)
        self.producer = SimpleProducer(self.kafka, async=True)

    def send(self, message):
        self.producer.send_messages(self.topic, message)

    def sendBulk(self, messages):
        self.producer.send_messages(self.topic, *messages)

    def close(self):
        self.producer.stop()
        self.kafka.close()
        self.kafka = None
        self.producer = None


VISITING_PRODUCER = None


def sendVisitingMessage(org, domain, userId, url, html):
    global VISITING_PRODUCER
    if VISITING_PRODUCER is None:
        VISITING_PRODUCER = KafkaProducer(datawakeconfig.KAFKA_CONN_POOL, datawakeconfig.KAFKA_PUBLISH_TOPIC)
    try:
        message = [datetime.utcnow().strftime("%s"), org, domain, userId, url, html]
        message = map(lambda x: x.replace('\0', ''), message)
        message = '\0'.join(message)
        VISITING_PRODUCER.send(message)
    except:
        try:
            VISITING_PRODUCER.close()
        except:
            pass
        VISITING_PRODUCER = None
        raise


TRAIL_PRODUCER = None


def send_trail_term_message(org, domain, trail, term, validEntity=True):
    global TRAIL_PRODUCER
    if TRAIL_PRODUCER is None:
        TRAIL_PRODUCER = KafkaProducer(datawakeconfig.KAFKA_CONN_POOL, datawakeconfig.KAFKA_TRAIL_TOPIC)

    try:
        message = "%s\0%s\0%s\0%s\0%s" % (org, domain, trail, term, str(validEntity))
        utf8_encoded_message = message.encode("utf-8")
        TRAIL_PRODUCER.send(utf8_encoded_message)
    except:
        try:
            TRAIL_PRODUCER.close()
        except:
            pass
        TRAIL_PRODUCER = None
        raise
