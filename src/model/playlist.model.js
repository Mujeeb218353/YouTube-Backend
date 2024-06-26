import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        videos: [
            {
                owner: Schema.Types.ObjectId,
                ref: 'video'
            },
        ],
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
    },
    {
        timestamps: true
    }
);

playlistSchema.plugin(mongooseAggregatePaginate);
export const playlist = mongoose.model("playlist", playlistSchema);