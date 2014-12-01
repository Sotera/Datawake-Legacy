package com.soteradefense.datawake.trails.spouts

import java.util
import java.util.Properties

import backtype.storm.spout.SpoutOutputCollector
import backtype.storm.task.TopologyContext
import backtype.storm.topology.OutputFieldsDeclarer
import backtype.storm.topology.base.BaseRichSpout
import backtype.storm.tuple.Fields
import com.soteradefense.datawake.trails.data.StormData
import kafka.consumer.{Consumer, ConsumerConfig, ConsumerConnector, KafkaStream}
import kafka.serializer.{Decoder, StringDecoder}

class HighLevelKafkaConsumer[T <: StormData](outputFields: Fields, decoder: Decoder[T], zookeeperQuorum: String, topic: String, groupId: String = "trail-search-demo") extends BaseRichSpout {
  var collector: SpoutOutputCollector = null
  var stream: KafkaStream[String, T] = null

  var connector: ConsumerConnector = null

  override def open(conf: util.Map[_, _], context: TopologyContext, collector: SpoutOutputCollector): Unit = {
    this.collector = collector
    connector = Consumer.create(getConsumerConfig)
    val topicCountMap = Map((topic, 1))
    stream = connector.createMessageStreams(topicCountMap, new StringDecoder(), decoder).get(topic).get(0)
  }

  override def nextTuple(): Unit = {
    stream.foreach { messageAndMetadata =>
      if (messageAndMetadata.message != null) {
        collector.emit(messageAndMetadata.message().toValues)
      }
    }
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declare(outputFields)
  }

  def getConsumerConfig: ConsumerConfig = {
    val properties = new Properties()
    properties.put("zookeeper.connect", zookeeperQuorum)
    properties.put("group.id", groupId)
    properties.put("zookeeper.session.timeout.ms", "3000")
    properties.put("zookeeper.sync.time.ms", "200")
    properties.put("auto.commit.interval.ms", "1000")
    properties.put("kafka.serializer.Decoder", decoder.getClass.toString)
    new ConsumerConfig(properties)
  }

  override def close(): Unit = {
    if (connector != null)
      connector.shutdown()
  }
}
