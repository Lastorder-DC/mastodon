# frozen_string_literal: true

class DmMessageAttachment < ApplicationRecord
  belongs_to :dm_message
  belongs_to :media_attachment
end
