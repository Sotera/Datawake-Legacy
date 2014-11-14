package com.soteradefense.datawake.trails.topology.search.data

case class DatawakeInternetResult(title: String, url: String){
  override def equals(o: Any) = o match {
    case that: DatawakeInternetResult => that.url.equals(this.url)
    case _ => false
  }
  override def hashCode = this.url.toUpperCase.hashCode
}
