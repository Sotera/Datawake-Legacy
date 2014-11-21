package com.soteradefense.datawake.trails.topology.save.data

import backtype.storm.tuple.Values
import com.soteradefense.datawake.trails.data.StormData

class DatawakeCrawlerData(org: String, domain: String, trail: String, url: String, html: String, title: String)
  extends StormData {
  override def toValues: Values = {
    new Values(org, domain, trail, url, html, title)
  }
}
