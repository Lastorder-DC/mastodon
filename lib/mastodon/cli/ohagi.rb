# frozen_string_literal: true

require 'concurrent'
require_relative 'base'

module Mastodon::CLI
  class Ohagi < Base
    desc 'good', 'Ohagi is good'
    def good
      say('Thanks!', :green)
    end

    desc 'bad', 'Ohagi is bad'
    def bad
      say('Sorry...', :red)
    end

    desc 'tsubuan', 'Ohagi is tsubuan'
    def tsubuan
      say('Thanks! You are knight in shining armor!', :green)
    end

    desc 'koshian', 'Ohagi is koshian'
    def koshian
      say('Let the WAR begin.', :red)
    end

    desc 'oguraan', 'Ohagi is oguraan'
    def oguraan
      say('I hate you.', :yellow)
    end
  end
end
