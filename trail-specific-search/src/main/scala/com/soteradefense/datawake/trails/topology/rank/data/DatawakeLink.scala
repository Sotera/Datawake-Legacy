package com.soteradefense.datawake.trails.topology.rank.data

import backtype.storm.tuple.Values
import com.soteradefense.datawake.trails.data.StormData

class DatawakeLink(org: String, domain: String, trail: String, link: String) extends StormData {
  override def toValues: Values = {
    new Values(org, domain, trail, link)
  }
}
