package com.soteradefense.datawake.trails.entitycount.data

import backtype.storm.tuple.Values
import com.soteradefense.datawake.trails.data.StormData

class LinkTrailData(org: String, domain: String, trail: String, term: String, url: String, html: String, title: String)
  extends StormData {
  override def toValues: Values = {
    new Values(org, domain, trail, term, url, html, title)
  }
}
