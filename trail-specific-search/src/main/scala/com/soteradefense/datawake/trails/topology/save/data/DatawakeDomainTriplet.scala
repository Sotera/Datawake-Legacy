package com.soteradefense.datawake.trails.topology.save.data

/**
 * Helper class for defining parameters passed along with the crawl request.
 * @param org Org
 * @param domain Domain
 * @param trail Trail
 * @param title Url's title
 * @param rank Rank of the Url
 */
case class DatawakeDomainTriplet(org: String, domain: String, trail: String, title: String, rank: String)
