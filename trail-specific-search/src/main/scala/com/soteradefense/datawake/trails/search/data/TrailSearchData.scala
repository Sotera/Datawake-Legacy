package com.soteradefense.datawake.trails.search.data

import backtype.storm.tuple.Values
import com.soteradefense.datawake.trails.data.StormData

class TrailSearchData(org: String, domain: String, trail: String, term: String) extends StormData {
  override def toValues: Values = {
    new Values(org, domain, trail, term)
  }

}