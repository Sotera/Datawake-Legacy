package com.soteradefense.datawake.trails.spouts

import java.util
import java.util.Properties
import org.slf4j.{Logger, LoggerFactory}


import backtype.storm.spout.SpoutOutputCollector
import backtype.storm.task.TopologyContext
import backtype.storm.topology.OutputFieldsDeclarer
import backtype.storm.topology.base.BaseRichSpout
import backtype.storm.tuple.Fields
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.data.StormData
import kafka.consumer.{Consumer, ConsumerConfig, ConsumerConnector, KafkaStream}
import kafka.serializer.{Decoder, StringDecoder}


/**
 * Class that defines a High-level kafka consumer
 * @param outputFields Expected output fields
 * @param decoder Class for decoding the kafka message.
 * @param topic The topic to read from
 * @param groupId The group id that reads from kafka
 * @tparam T An instance of StormData
 */
class HighLevelKafkaConsumer[T <: StormData](outputFields: Fields, decoder: Decoder[T], topic: String, groupId: String = "trail-search-demo") extends BaseRichSpout {
  var collector: SpoutOutputCollector = null
  var stream: KafkaStream[String, T] = null
  var logger: Logger = null
  var connector: ConsumerConnector = null

  override def open(conf: util.Map[_, _], context: TopologyContext, collector: SpoutOutputCollector): Unit = {
    this.collector = collector
    logger = LoggerFactory.getLogger(this.getClass)
    val zkQuorum: String = conf.get(DatawakeConstants.ZK_NODES_ID).asInstanceOf[String]
    connector = Consumer.create(getConsumerConfig(zkQuorum))
    val topicCountMap = Map((topic, 1))
    stream = connector.createMessageStreams(topicCountMap, new StringDecoder(), decoder).get(topic).get(0)
  }

  override def nextTuple(): Unit = {
    stream.foreach { messageAndMetadata =>
      if (messageAndMetadata.message != null) {
        var value = messageAndMetadata.message().toValues
        logger.info("Message: {}", value)
        collector.emit(value)
      }
    }
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declare(outputFields)
  }

  def getConsumerConfig(zkQuorum: String): ConsumerConfig = {
    val properties = new Properties()
    properties.put("zookeeper.connect", zkQuorum)
    properties.put("group.id", groupId)
    properties.put("zookeeper.session.timeout.ms", "3000")
    properties.put("zookeeper.sync.time.ms", "200")
    properties.put("fetch.message.max.bytes", "10000000")
    properties.put("auto.commit.interval.ms", "1000")
    properties.put("kafka.serializer.Decoder", decoder.getClass.toString)
    new ConsumerConfig(properties)
  }

  override def close(): Unit = {
    if (connector != null)
      connector.shutdown()
  }
}
