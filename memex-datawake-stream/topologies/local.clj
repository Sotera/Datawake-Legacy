(ns test1
(:use     [streamparse.specs])
(:gen-class))

(defn test1 [options]

[
    ;; spout configuration
    {

        ;; TODO Spouts should be replaced with JVM spouts that can be paralleized

        ;; VISITED
        "datawake-visited-spout" (python-spout-spec
            options
            "datawakestreams.kafka_spouts.KafkaDatawakeVisitedSpout"
            ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
            :p 1
        )

        ;; CRAWLER
        "crawler-spout" (python-spout-spec
            options
            "localcrawler.crawler_spout.CrawlerSpout"
            ["craw_request"]
            :p 1
        )

        ;; LOOK AHEAD
        "datawake-lookahead-spout" (python-spout-spec
            options
            "datawakestreams.kafka_spouts.KafkaDatawakeLookaheadSpout"
            { "raw" ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
              "links"  ["attribute", "value", "extracted_raw", "extracted_metadata","context"] }
            :p 1
        )


    }

    ;; bolt configuration
    {


        ;; VISITED



        "email-bolt" (python-bolt-spec
            options
            {"datawake-visited-spout" :shuffle }
            "datawakestreams.extractors.email_bolt.EmailBolt"
            ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
        )

        "phone-bolt" (python-bolt-spec
            options
            {"datawake-visited-spout" :shuffle }
            "datawakestreams.extractors.phone_bolt.PhoneBolt"
            ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
        )

        "website-bolt" (python-bolt-spec
            options
            {"datawake-visited-spout" :shuffle }
            "datawakestreams.extractors.website_bolt.WebsiteBolt"
            ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
        )

        ;; write extracted links to the crawler-in
        "crawler-queue-writer" (python-bolt-spec
            options
            {"website-bolt" :shuffle}
            "datawakestreams.crawl_queue_writer.CrawlerQueueWriter"
            []
            :p 1
        )




        ;; CRAWLER



        ;; fetch web pages from extracted links, and write them to crawler-out
        "crawler-bolt" (python-bolt-spec
            options
            {"crawler-spout" :shuffle }
            "localcrawler.crawler_bolt.CrawlerBolt"
            []
            :p 1
        )



        ;; LOOKAHEAD



         "lookahead-email-bolt" (python-bolt-spec
            options
            {["datawake-lookahead-spout" "raw"] :shuffle }
            "datawakestreams.extractors.email_bolt.EmailBolt"
            ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
         )


         "lookahead-phone-bolt" (python-bolt-spec
             options
             {["datawake-lookahead-spout" "raw"] :shuffle }
             "datawakestreams.extractors.phone_bolt.PhoneBolt"
             ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
         )





        ;; WRITER BOLT - FOR TESTING ONLY.  To be replaced by data store writers
        "writer-bolt" (python-bolt-spec
              options
              {"email-bolt" :shuffle
              "phone-bolt" :shuffle
              "website-bolt" :shuffle
              "lookahead-email-bolt" :shuffle
              "lookahead-phone-bolt" :shuffle
              ["datawake-lookahead-spout" "links"] :shuffle}
              "datawakestreams.writer_bolt.FileWriterBolt"
              []
              :p 1
              )



    }

 ]
)
