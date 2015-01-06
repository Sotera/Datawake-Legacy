package com.soteradefense.datawake.trails.topology.rank.data

import backtype.storm.tuple.Values
import com.soteradefense.datawake.trails.data.StormData

/**
 * Helper object for defining a link to update rank.
 * @param org Org the link belongs to
 * @param domain Domain the link belongs to
 * @param trail Trail the link belongs to
 * @param link The link to update.
 */
class DatawakeLink(org: String, domain: String, trail: String, link: String) extends StormData {
  override def toValues: Values = {
    new Values(org, domain, trail, link)
  }
}
