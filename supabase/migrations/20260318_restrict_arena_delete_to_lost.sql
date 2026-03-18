-- Drop the existing permissive DELETE policy
DROP POLICY IF EXISTS "Users delete own arena predictions" ON public.arena_predictions;

-- Create new DELETE policy: only allow deleting own predictions with status 'loss' or 'lost'
CREATE POLICY "Users delete own lost arena predictions"
ON public.arena_predictions
FOR DELETE
TO public
USING (
  auth.uid() = user_id
  AND status IN ('loss', 'lost')
);
