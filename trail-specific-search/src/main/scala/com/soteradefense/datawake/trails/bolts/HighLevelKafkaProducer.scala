package com.soteradefense.datawake.trails.bolts

import java.util
import java.util.Properties

import backtype.storm.task.TopologyContext
import backtype.storm.topology.OutputFieldsDeclarer
import backtype.storm.topology.base.BaseBasicBolt
import kafka.producer.{Producer, ProducerConfig}
import org.slf4j.{Logger, LoggerFactory}

/**
 * Abstract class that creates a kafka producer
 * @param brokers Comma-separated list of kafka brokers
 * @param topic The topic to write to.
 */
abstract class HighLevelKafkaProducer(brokers: String, topic: String) extends BaseBasicBolt {
  var kafkaProducer: Producer[String, String] = null
  var logger: Logger = null
  var kafkaBrokers: String = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    kafkaBrokers = brokers
    kafkaProducer = new Producer[String, String](createProducerConfig)
    logger = LoggerFactory.getLogger(this.getClass)
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    //Do Nothing
  }

  /**
   * Creates the producer configuration for connecting to kafka.
   * @return ProducerConfig object
   */
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
