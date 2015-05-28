package com.soteradefense.datawake.trails.topology.save.bolt

import backtype.storm.topology.BasicOutputCollector
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.bolts.HighLevelKafkaProducer
import kafka.producer.KeyedMessage

class UpdateUrlKafkaProducer(topic: String, brokers: String) extends HighLevelKafkaProducer(brokers, topic) {
  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("org")
    val domain = input.getStringByField("domain")
    val trail = input.getStringByField("trail")
    val url = input.getStringByField("url")
    val builder = new StringBuilder
    builder.append(org)
    builder.append("\0")
    builder.append(domain)
    builder.append("\0")
    builder.append(trail)
    builder.append("\0")
    builder.append(url)
    val messageContents = builder.toString()
    logger.info(messageContents)
    val message = new KeyedMessage[String, String](topic, messageContents)
    kafkaProducer.send(message)
  }
}
