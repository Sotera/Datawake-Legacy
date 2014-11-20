package com.soteradefense.datawake.trails.search.bolts

import java.io.InputStreamReader
import java.net.{URL, URLEncoder}
import java.util

import backtype.storm.task.TopologyContext
import backtype.storm.topology.base.BaseBasicBolt
import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.{Fields, Tuple, Values}
import com.soteradefense.datawake.trails.search.json.SearchResults
import net.liftweb.json._

class GoogleSearchBolt(outputFields: Fields) extends BaseBasicBolt {

  val GOOGLE_API: String = "http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q="
  val DEFAULT_CHARSET: String = "UTF-8"
  val RESULT_SET: String = "&rsz=8"

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
  }

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val searchTerm: String = input.getStringByField("kafkaTerm")
    val org: String = input.getStringByField("kafkaOrg")
    val domain: String = input.getStringByField("kafkaDomain")
    val trail: String = input.getStringByField("kafkaTrail")
    val url: URL = new URL(GOOGLE_API + searchTerm + RESULT_SET)
    val reader = new InputStreamReader(url.openStream(), DEFAULT_CHARSET)
    implicit val formats = DefaultFormats
    val jValue = JsonParser.parse(reader)
    val results = jValue.extract[SearchResults]
    if (results.responseData != null) {
      results.responseData.results.foreach(f => {
        collector.emit(new Values(org, domain, trail, f.url, f.title, searchTerm))
      })
    }
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declare(outputFields)
  }

  override def cleanup(): Unit = {
    super.cleanup()
  }
}
