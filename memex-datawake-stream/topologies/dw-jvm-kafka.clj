(ns kafka-topo
    (:use [backtype.storm.clojure]
        [streamparse.specs])
    (:import [storm.kafka SpoutConfig
         KafkaSpout
         StringScheme
         ZkHosts]
    [backtype.storm.spout SchemeAsMultiScheme])
    (:gen-class)
)


(def zk (ZkHosts. "localhost:2181"))
(def zkroot "/storm")

;; Java Interop code that creates a JVM KafkaSpout
(defn kafka-spout [topic consumer]
    (let [config (SpoutConfig. zk topic zkroot consumer)]
        (set! (.scheme config) (SchemeAsMultiScheme. (StringScheme.)))
        (KafkaSpout. config)))


(def incoming-dw-visited-spout
    (kafka-spout "memex-datawake-visited" "memex-datawake-visited-consumer"))





;; ===================
;; Topology Definition
;; ===================



(defn kafka-topo [options]
[
     ;;spout configuration
    {
    "incoming-dw-visited-spout" (spout-spec
    incoming-dw-visited-spout
        :p 1)
    }

    {
     ;; The kafka-bolt parses incoming tuples from the JVM Spout.
     ;; It then dispatches them to Storm streams.
     ;; The name of each stream is equal to the Kafka topic name.
     ;; A 'default' stream will forward raw messages that could
     ;; not dispatch successfully. Non-JSON messages will also
     ;; be fail()'ed automatically.
    "kafka-bolt" (python-bolt-spec
          options
          ;; input
          { "incoming-dw-visited-spout" :shuffle }

          ;; Python class
          "bolts.dwvisited.datawake_visited_kafka_bolt.DatawakeVisitedKafkaBolt"
           ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
          ;; parallelism
          :p 1
      )

     "email-bolt" (python-bolt-spec
             options
             {"kafka-bolt" :shuffle }
             "bolts.extractors.email_bolt.EmailBolt"
             ["attribute", "value", "extracted_raw", "extracted_metadata","context"]

             )

    "phone-bolt" (python-bolt-spec
             options
             {"kafka-bolt" :shuffle }
             "bolts.extractors.phone_bolt.PhoneBolt"
             ["attribute", "value", "extracted_raw", "extracted_metadata","context"]

             )

    "website-bolt" (python-bolt-spec
               options
               {"kafka-bolt" :shuffle }
               "bolts.extractors.website_bolt.WebsiteBolt"
               ["attribute", "value", "extracted_raw", "extracted_metadata","context"]

               )


    "writer-bolt" (python-bolt-spec
              options
              {"email-bolt" :shuffle
              "phone-bolt" :shuffle
              "website-bolt" :shuffle }
              "bolts.dwvisited.datawake_visited_writer_bolt.DatawakeVisitedWriterBolt"
              []
              :p 2
              )

}
]
)