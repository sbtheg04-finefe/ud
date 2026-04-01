import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { 
  useListComments, 
  useCreateComment, 
  getListCommentsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Send } from "lucide-react";

interface CommentSectionProps {
  targetType: "meal" | "video";
  targetId: number;
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const [commentText, setCommentText] = useState("");
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useListComments(targetType, targetId, {
    query: { enabled: !!targetId, queryKey: getListCommentsQueryKey(targetType, targetId) }
  });

  const createComment = useCreateComment({
    mutation: {
      onSuccess: () => {
        setCommentText("");
        queryClient.invalidateQueries({
          queryKey: getListCommentsQueryKey(targetType, targetId)
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    createComment.mutate({
      data: {
        userId: user.id,
        targetType,
        targetId,
        body: commentText.trim()
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="font-serif text-lg font-bold">Comments ({comments?.length || 0})</h3>
      
      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-4 items-start">
          <Avatar className="h-10 w-10 mt-1">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="resize-none min-h-[80px]"
              disabled={createComment.isPending}
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="sm" 
                disabled={!commentText.trim() || createComment.isPending}
                className="gap-2"
              >
                {createComment.isPending ? "Posting..." : "Post Comment"}
                {!createComment.isPending && <Send size={16} />}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-6 mt-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))
        ) : comments?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl bg-card/50">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments?.map((comment) => (
            <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={comment.user.avatarUrl || undefined} />
                <AvatarFallback>{comment.user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">{comment.user.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
