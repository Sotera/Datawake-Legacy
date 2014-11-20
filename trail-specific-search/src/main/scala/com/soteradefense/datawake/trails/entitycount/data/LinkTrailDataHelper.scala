package com.soteradefense.datawake.trails.entitycount.data

case class LinkTrailDataHelper(appid: String, url: String, raw_html: String, attrs: DomainTriplet)

case class DomainTriplet(org: String, domain: String, trail: String, title: String, term: String)
