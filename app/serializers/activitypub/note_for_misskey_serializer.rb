# frozen_string_literal: true

class ActivityPub::NoteForMisskeySerializer < ActivityPub::NoteSerializer
  def cc
    ActivityPub::TagManager.instance.cc_for_misskey(object)
  end
end
