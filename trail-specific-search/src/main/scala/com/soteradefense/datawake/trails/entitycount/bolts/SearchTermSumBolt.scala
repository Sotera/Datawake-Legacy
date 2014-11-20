package com.soteradefense.datawake.trails.entitycount.bolts

import backtype.storm.topology.base.BaseBasicBolt
import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.{Fields, Tuple, Values}

class SearchTermSumBolt(outputFields: Fields) extends BaseBasicBolt {
  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val term = input.getStringByField("kafkaTerm")
    val link = input.getStringByField("kafkaLink")
    val html = input.getStringByField("kafkaHtml")
    val title = input.getStringByField("kafkaTitle")
    val Word = term.r
    val count = Word.findAllIn(html).size.asInstanceOf[java.lang.Integer]
    collector.emit(new Values(
      input.getStringByField("kafkaOrg"),
      input.getStringByField("kafkaDomain"),
      input.getStringByField("kafkaTrail"),
      link,
      title,
      count
    ))
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declare(outputFields)
  }
}
