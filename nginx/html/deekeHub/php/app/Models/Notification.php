<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'recipient_id', 'recipient_type', 'title', 'content', 'is_read',
    ];

    public function scopeForRecipient($query, $id, $type)
    {
        return $query->where('recipient_id', $id)->where('recipient_type', $type);
    }

    public function scopeUnread($query)
    {
        return $query->where('is_read', 0);
    }
}
