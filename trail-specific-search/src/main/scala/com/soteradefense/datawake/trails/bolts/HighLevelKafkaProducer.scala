package com.soteradefense.datawake.trails.bolts

import java.util
import java.util.Properties

import backtype.storm.task.TopologyContext
import backtype.storm.topology.OutputFieldsDeclarer
import backtype.storm.topology.base.BaseBasicBolt
import kafka.producer.{Producer, ProducerConfig}

abstract class HighLevelKafkaProducer(kafkaBrokers: String, topic: String) extends BaseBasicBolt {
  var kafkaProducer: Producer[String, String] = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    kafkaProducer = new Producer[String, String](createProducerConfig)
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    //Do Nothing
  }

  def createProducerConfig: ProducerConfig = {
    val props = new Properties()

    props.put("metadata.broker.list", kafkaBrokers)
    props.put("serializer.class", "kafka.serializer.StringEncoder")
    props.put("request.required.acks", "1")

    new ProducerConfig(props)
  }


  override def cleanup(): Unit = {
    super.cleanup()
    if (kafkaProducer != null)
      kafkaProducer.close()
  }
}
