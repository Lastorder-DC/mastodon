# frozen_string_literal: true

class REST::DomainBlockSerializer < ActiveModel::Serializer
  attributes :domain, :digest, :severity, :severity_ex, :comment

  def domain
    object.public_domain
  end

  def digest
    object.domain_digest
  end

  def severity
    object.severity == 'noop' ? 'silence' : object.severity
  end

  def severity_ex
    object.severity
  end

  def comment
    object.public_comment if instance_options[:with_comment]
  end
end
